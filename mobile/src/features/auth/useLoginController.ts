import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useStartup} from '../../app/startup/StartupProvider';
import {createRuntimeConfig} from '../../config/runtime';
import {HttpClient} from '../../data/http';
import {appLogger} from '../../observability/logger';
import {AuthClient} from './AuthClient';
import {
  authSessionFromLogin,
  isLoginCancellation,
  loginErrorMessage,
} from './login';

interface LoginController {
  checkingServer: boolean;
  submitting: boolean;
  error: string;
  canRetryServerCheck: boolean;
  registrationOpen: boolean;
  submit(username: string, password: string): Promise<boolean>;
  clearError(): void;
  retryServerCheck(): void;
}

const logger = appLogger.child('login');

export function useLoginController(serverAddress: string): LoginController {
  const {acceptSession} = useStartup();
  const [checkingServer, setCheckingServer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorSource, setErrorSource] = useState<
    'server_check' | 'submit' | null
  >(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  const authClient = useMemo(() => {
    const runtime = createRuntimeConfig(serverAddress);
    return new AuthClient(new HttpClient({baseUrl: runtime.apiBaseUrl}));
  }, [serverAddress]);

  const finishLogin = useCallback(
    async (username: string, password: string, signal?: AbortSignal) => {
      const response = await authClient.login(username, password, signal);
      await acceptSession(authSessionFromLogin(response, serverAddress));
    },
    [acceptSession, authClient, serverAddress],
  );

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setCheckingServer(true);
    setError('');
    setErrorSource(null);

    const check = async () => {
      try {
        const status = await authClient.getStatus(controller.signal);
        if (!status.enabled) {
          await finishLogin('', '', controller.signal);
          return;
        }
        const registration = await authClient.getRegistrationStatus(
          controller.signal,
        );
        setRegistrationOpen(registration.registration_open);
      } catch (nextError) {
        if (!isLoginCancellation(nextError)) {
          logger.warn('Unable to inspect auth mode', nextError);
          setError(loginErrorMessage(nextError));
          setErrorSource('server_check');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingServer(false);
        }
      }
    };
    check().catch(nextError =>
      logger.error('Auth mode check failed', nextError),
    );
    return () => controller.abort();
  }, [authClient, checkVersion, finishLogin]);

  const submit = useCallback(
    async (username: string, password: string) => {
      if (submitting) {
        return false;
      }
      const controller = new AbortController();
      requestRef.current?.abort();
      requestRef.current = controller;
      setSubmitting(true);
      setError('');
      setErrorSource(null);
      try {
        await finishLogin(username.trim(), password, controller.signal);
        return true;
      } catch (nextError) {
        if (!isLoginCancellation(nextError)) {
          logger.warn('Login rejected', nextError);
          setError(loginErrorMessage(nextError));
          setErrorSource('submit');
        }
        return false;
      } finally {
        if (!controller.signal.aborted) {
          setSubmitting(false);
        }
      }
    },
    [finishLogin, submitting],
  );

  return {
    checkingServer,
    submitting,
    error,
    canRetryServerCheck: errorSource === 'server_check',
    registrationOpen,
    submit,
    clearError: () => {
      setError('');
      setErrorSource(null);
    },
    retryServerCheck: () => setCheckVersion(version => version + 1),
  };
}
