import type {ChatModelAdapter} from '@assistant-ui/react-native';

import {extractLastUserText} from './messageText';

const wait = (duration: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, duration);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('Generation cancelled'));
      },
      {once: true},
    );
  });

export function createMockChatModelAdapter(): ChatModelAdapter {
  return {
    async *run({messages, abortSignal}) {
      const question = extractLastUserText(messages) || '这个问题';
      const chunks = [
        `我收到了「${question}」。`,
        ' 下一步会把这里替换成 DeepTutor WebSocket Adapter，',
        '同时保留 Assistant UI 的消息、输入和停止交互。',
      ];
      let text = '';

      for (const chunk of chunks) {
        await wait(180, abortSignal);
        text += chunk;
        yield {content: [{type: 'text', text}]};
      }
    },
  };
}
