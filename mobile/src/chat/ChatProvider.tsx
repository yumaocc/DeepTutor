import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {useExternalStoreRuntime} from '@assistant-ui/core/react';
import {AppState} from 'react-native';
import {
  AssistantRuntimeProvider,
  type ThreadMessageLike,
} from '@assistant-ui/react-native';
import {useStartup} from '../app/startup/StartupProvider';
import {createRuntimeConfig} from '../config/runtime';
import {HttpClient, serverWebSocketPath} from '../data/http';
import {useNetworkStatus} from '../platform/network/NetworkStatusProvider';
import {ChatClient, type ChatSnapshot} from './ChatClient';
import {
  outgoingAttachments,
  validateAttachments,
} from './imageAttachments';
import type {ChatMessage} from './protocol';
import {AuthClient} from '../features/auth/AuthClient';
import type {AuthStatus} from '../features/auth/contracts';
const Context = createContext<{
  client: ChatClient;
  snapshot: ChatSnapshot;
  http: HttpClient;
  server: string;
  identity: string;
  isGuest: boolean;
  trial: AuthStatus['trial'];
} | null>(null);
function convertMessage(message: ChatMessage): ThreadMessageLike {
  return {
    id: message.uiId || message.id,
    role: message.role,
    content: message.content,
    ...(message.role === 'assistant'
      ? {
          status:
            message.status === 'running'
              ? {type: 'running' as const}
              : message.status === 'error'
              ? {type: 'incomplete' as const, reason: 'error' as const}
              : message.status === 'cancelled'
              ? {type: 'incomplete' as const, reason: 'cancelled' as const}
              : {type: 'complete' as const, reason: 'stop' as const},
        }
      : {}),
    metadata: {custom: {deeptutor: message}},
  };
}
export function ChatProvider({
  children,
}: React.PropsWithChildren): JSX.Element | null {
  const {state, clearSession} = useStartup();
  const network = useNetworkStatus();
  const session = state.phase === 'ready' ? state.session : null;
  const [trial, setTrial] = useState<AuthStatus['trial']>(session?.trial ?? null);
  const wasRunning = useRef(false);
  const server = session?.serverAddress ?? '';
  const http = useMemo(
    () =>
      new HttpClient({
        baseUrl: server || 'http://localhost',
        getAccessToken: () => session?.accessToken,
        onUnauthorized: clearSession,
      }),
    [server, session, clearSession],
  );
  const client = useMemo(
    () =>
      new ChatClient(http, {
        allowUnversionedEvents: http.apiPrefix === '/api/v1',
        url: `${
          createRuntimeConfig(server || 'http://localhost').wsBaseUrl
        }${serverWebSocketPath(server)}`,
        getAccessToken: () => session?.accessToken,
      }),
    [http, server, session],
  );
  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  );
  useEffect(() => {
    client.transport.setAppActive(
      AppState.currentState !== 'background' &&
        AppState.currentState !== 'inactive',
    );
    const subscription = AppState.addEventListener('change', value =>
      client.transport.setAppActive(value === 'active'),
    );
    return () => {
      subscription.remove();
      client.dispose();
    };
  }, [client]);
  useEffect(() => {
    client.transport.setNetworkOnline(network.status !== 'offline');
  }, [client, network.status]);
  useEffect(() => {
    setTrial(session?.trial ?? null);
  }, [session]);
  useEffect(() => {
    const justFinished = wasRunning.current && !snapshot.running;
    wasRunning.current = snapshot.running;
    if (!justFinished || session?.subjectType !== 'guest') {
      return;
    }
    const timer = setTimeout(() => {
      new AuthClient(http)
        .getStatus()
        .then(status => setTrial(status.trial ?? null))
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [http, session?.subjectType, snapshot.running]);
  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages: snapshot.messages,
    isRunning: snapshot.running,
    isLoading: snapshot.loading,
    isSendDisabled: snapshot.loading,
    convertMessage,
    onNew: async message => {
      const attachments = outgoingAttachments(message.attachments || []);
      validateAttachments(attachments);
      await client.send(
        message.content.map(p => (p.type === 'text' ? p.text : '')).join('\n'),
        'chat',
        attachments,
      );
    },
    onCancel: () => client.cancel(),
    onReload: () => client.regenerate(),
  });
  if (!session) {
    return null;
  }
  return (
    <Context.Provider
      value={{
        client,
        snapshot,
        http,
        server,
        identity: session.user.id,
        isGuest: session.subjectType === 'guest',
        trial,
      }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </Context.Provider>
  );
}
export function useChat() {
  const value = useContext(Context);
  if (!value) {
    throw new Error('ChatProvider is missing');
  }
  return value;
}
