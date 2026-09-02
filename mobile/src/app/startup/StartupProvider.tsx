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
import {HttpClient, isHttpError} from '../../data/http';
import {appLogger} from '../../observability/logger';
import {useNetworkStatus} from '../../platform/network/NetworkStatusProvider';
import {authSessionRepository, runtimeSettingsRepository} from '../services';
import type {StartupActions, StartupState} from './types';
import type {AuthSession} from '../../features/auth/AuthSessionRepository';

interface StartupContextValue extends StartupActions {
  state: StartupState;
}

const StartupContext = createContext<StartupContextValue | null>(null);
const logger = appLogger.child('startup');

export function StartupProvider({
  children,
}: React.PropsWithChildren): JSX.Element {
  const network = useNetworkStatus();
  const [state, setState] = useState<StartupState>({phase: 'booting'});
  const runId = useRef(0);
  const sessionOverride = useRef<AuthSession | null>(null);

  const evaluate = useCallback(async () => {
    const currentRun = ++runId.current;
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
        setState({phase: 'needs_auth', settings});
        return;
      }

      if (network.status === 'offline') {
        setState({phase: 'offline', settings, session});
        return;
      }

      const runtime = createRuntimeConfig(settings.serverAddress);
      const client = new HttpClient({
        baseUrl: runtime.apiBaseUrl,
        getAccessToken: () => session.accessToken,
        onUnauthorized: () => authSessionRepository.clear(),
      });
      await client.request({
        path: '/api/v1/auth/mobile/bootstrap',
        timeoutMs: 12_000,
      });
      if (currentRun !== runId.current) {
        return;
      }
      setState({phase: 'ready', settings, session});
    } catch (error) {
      if (currentRun !== runId.current) {
        return;
      }
      if (isHttpError(error) && error.status === 401) {
        const settings = await runtimeSettingsRepository.load();
        sessionOverride.current = null;
        await authSessionRepository.clear();
        setState(
          settings ? {phase: 'needs_auth', settings} : {phase: 'needs_server'},
        );
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
  }, [network.status]);

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
