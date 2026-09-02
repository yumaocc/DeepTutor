import React, {useMemo} from 'react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from '@assistant-ui/react-native';

import {AppProviders} from './src/app/AppProviders';
import {RootNavigator} from './src/app/navigation/RootNavigator';
import {StartupProvider} from './src/app/startup/StartupProvider';
import {createMockChatModelAdapter} from './src/chat/mockChatModelAdapter';

function App(): JSX.Element {
  const adapter = useMemo(() => createMockChatModelAdapter(), []);
  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '你好，我是 DeepTutor。这个页面正在验证 Paper、Assistant UI 和 RNOH 的基础集成。',
          },
        ],
      },
    ],
  });

  return (
    <AppProviders>
      <AssistantRuntimeProvider runtime={runtime}>
        <StartupProvider>
          <RootNavigator />
        </StartupProvider>
      </AssistantRuntimeProvider>
    </AppProviders>
  );
}

export default App;
