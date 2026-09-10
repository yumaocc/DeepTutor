import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {createRuntimeConfig} from '../../config/runtime';
import type {RuntimeSettings} from '../../config/RuntimeSettingsRepository';
import {HttpClient, HttpError, isHttpError} from '../../data/http';
import {appLogger} from '../../observability/logger';
import {authSessionRepository, runtimeSettingsRepository} from '../services';
import type {StartupActions, StartupState} from './types';
import type {AuthSession} from '../../features/auth/AuthSessionRepository';
import {AuthClient} from '../../features/auth/AuthClient';
import {
  authSessionFromGuest,
  authSessionFromStatus,
} from '../../features/auth/login';
import {getOrCreateInstallationId} from '../../features/auth/installation';
import {appStorage} from '../../platform/storage/asyncStorage';

interface StartupContextValue extends StartupActions {
  state: StartupState;
}

const StartupContext = createContext<StartupContextValue | null>(null);
const logger = appLogger.child('startup');

async function provisionIdentity(
  settings: RuntimeSettings,
): Promise<AuthSession | null> {
  const runtime = createRuntimeConfig(settings.serverAddress);
  const authClient = new AuthClient(new HttpClient({baseUrl: runtime.apiBaseUrl}));
  const status = await authClient.getStatus();
  if (status.authenticated) {
    return authSessionFromStatus(status, settings.serverAddress);
  }
  if (!status.guest_trial_available) {
    return null;
  }
  const installationId = await getOrCreateInstallationId(appStorage);
  try {
    const guest = await authClient.createGuestSession(installationId);
    return authSessionFromGuest(guest, settings.serverAddress);
  } catch (error) {
    // A disabled, exhausted, expired, or temporarily misconfigured trial must
    // still leave the normal account login available.
    if (isHttpError(error) && (error.status ?? 0) >= 400) {
      return null;
    }
    throw error;
  }
}

export function StartupProvider({
  children,
}: React.PropsWithChildren): JSX.Element {
  const [state, setState] = useState<StartupState>({phase: 'booting'});
  const runId = useRef(0);
  const sessionOverride = useRef<AuthSession | null>(null);

  const evaluate = useCallback(async () => {
    const currentRun = ++runId.current;
    let attemptedSession: AuthSession | null = null;
    setState({phase: 'booting'});
    try {
      const settings = await runtimeSettingsRepository.load();
      if (currentRun !== runId.current) {
        return;
      }
      if (!settings) {
        setState({phase: 'needs_server'});
        return;
      }

      const session =
        sessionOverride.current ?? (await authSessionRepository.load());
      attemptedSession = session;
      if (currentRun !== runId.current) {
        return;
      }
      const invalidSession =
        !session ||
        session.serverAddress !== settings.serverAddress ||
        (session.expiresAt !== null && session.expiresAt <= Date.now());
      if (invalidSession) {
        if (session) {
          sessionOverride.current = null;
          await authSessionRepository.clear();
        }
        setState({phase: 'provisioning_guest'});
        const provisioned = await provisionIdentity(settings);
        if (currentRun !== runId.current) {
          return;
        }
        if (!provisioned) {
          setState({phase: 'needs_auth', settings});
          return;
        }
        sessionOverride.current = provisioned;
        await authSessionRepository.save(provisioned);
        setState({phase: 'ready', settings, session: provisioned});
        return;
      }

      const runtime = createRuntimeConfig(settings.serverAddress);
      const client = new HttpClient({
        baseUrl: runtime.apiBaseUrl,
        getAccessToken: () => session.accessToken,
        onUnauthorized: () => authSessionRepository.clear(),
      });
      const authStatus = await new AuthClient(client).getStatus();
      if (!authStatus.authenticated) {
        throw new HttpError('Authentication is no longer valid', {
          code: 'http_error',
          status: 401,
          retryable: false,
        });
      }
      if (currentRun !== runId.current) {
        return;
      }
      const refreshedSession: AuthSession = {
        ...session,
        subjectType: authStatus.subject_type ?? session.subjectType,
        trial: authStatus.trial ?? null,
      };
      sessionOverride.current = refreshedSession;
      await authSessionRepository.save(refreshedSession);
      setState({phase: 'ready', settings, session: refreshedSession});
    } catch (error) {
      if (currentRun !== runId.current) {
        return;
      }
      if (isHttpError(error) && error.status === 401) {
        const settings = await runtimeSettingsRepository.load();
        sessionOverride.current = null;
        await authSessionRepository.clear();
        if (!settings) {
          setState({phase: 'needs_server'});
          return;
        }
        if (attemptedSession?.subjectType === 'guest') {
          setState({
            phase: 'needs_auth',
            settings,
            guestSession: attemptedSession,
          });
          return;
        }
        setState({phase: 'provisioning_guest'});
        try {
          const provisioned = await provisionIdentity(settings);
          if (currentRun !== runId.current) {
            return;
          }
          if (!provisioned) {
            setState({phase: 'needs_auth', settings});
            return;
          }
          sessionOverride.current = provisioned;
          await authSessionRepository.save(provisioned);
          setState({phase: 'ready', settings, session: provisioned});
        } catch (provisionError) {
          logger.error('Guest provisioning failed', provisionError);
          setState({
            phase: 'fatal',
            message:
              provisionError instanceof Error
                ? provisionError.message
                : 'Unable to start the guest trial',
          });
        }
        return;
      }
      if (isHttpError(error) && error.status === 426) {
        const settings = await runtimeSettingsRepository.load();
        setState(
          settings
            ? {phase: 'upgrade_required', settings}
            : {
                phase: 'fatal',
                message: 'The server requires a newer mobile app.',
              },
        );
        return;
      }
      if (isHttpError(error) && error.retryable) {
        const [settings, session] = await Promise.all([
          runtimeSettingsRepository.load(),
          authSessionRepository.load(),
        ]);
        if (settings && session) {
          setState({phase: 'offline', settings, session});
          return;
        }
      }
      logger.error('Startup failed', error);
      setState({
        phase: 'fatal',
        message:
          error instanceof Error ? error.message : 'Unable to start the app',
      });
    }
  }, []);

  useEffect(() => {
    evaluate().catch(error => logger.error('Startup evaluation failed', error));
    return () => {
      runId.current += 1;
    };
  }, [evaluate]);

  const actions = useMemo<StartupActions>(
    () => ({
      retry: evaluate,
      saveServer: async serverAddress => {
        const normalized = createRuntimeConfig(serverAddress).apiBaseUrl;
        sessionOverride.current = null;
        await authSessionRepository.clear();
        await runtimeSettingsRepository.save({
          serverAddress: normalized,
          locale: 'system',
          theme: 'system',
        });
        await evaluate();
      },
      acceptSession: async session => {
        sessionOverride.current = session;
        try {
          await authSessionRepository.save(session);
        } catch (error) {
          logger.warn(
            'Secure persistence unavailable; session remains memory-only',
            error,
          );
        }
        await evaluate();
      },
      changeServer: async () => {
        sessionOverride.current = null;
        await Promise.all([
          authSessionRepository.clear(),
          runtimeSettingsRepository.clear(),
        ]);
        await evaluate();
      },
      clearSession: async () => {
        sessionOverride.current = null;
        await authSessionRepository.clear();
        await evaluate();
      },
      showLogin: () => {
        setState(current => {
          if (current.phase === 'ready' || current.phase === 'offline') {
            return {
              phase: 'needs_auth',
              settings: current.settings,
              canContinueAsGuest: true,
              guestSession: current.session,
            };
          }
          return current;
        });
      },
      continueAsGuest: evaluate,
    }),
    [evaluate],
  );

  const value = useMemo(() => ({state, ...actions}), [actions, state]);
  return (
    <StartupContext.Provider value={value}>{children}</StartupContext.Provider>
  );
}

export function useStartup(): StartupContextValue {
  const value = useContext(StartupContext);
  if (!value) {
    throw new Error('useStartup must be used inside StartupProvider');
  }
  return value;
}
