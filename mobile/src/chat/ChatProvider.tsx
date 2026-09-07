import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
import {outgoingImages, validateImages} from './imageAttachments';
import type {ChatMessage} from './protocol';
const Context = createContext<{
  client: ChatClient;
  snapshot: ChatSnapshot;
  http: HttpClient;
  server: string;
  identity: string;
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
  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages: snapshot.messages,
    isRunning: snapshot.running,
    isLoading: snapshot.loading,
    isSendDisabled: snapshot.loading,
    convertMessage,
    onNew: async message => {
      const images = outgoingImages(message.attachments || []);
      validateImages(images);
      await client.send(
        message.content.map(p => (p.type === 'text' ? p.text : '')).join('\n'),
        'chat',
        images,
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
      value={{client, snapshot, http, server, identity: session.user.id}}>
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
