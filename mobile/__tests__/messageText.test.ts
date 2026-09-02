import type {ThreadMessage} from '@assistant-ui/react-native';
import {describe, expect, it} from '@jest/globals';

import {extractLastUserText, extractMessageText} from '../src/chat/messageText';

const message = (
  id: string,
  role: 'user' | 'assistant',
  text: string,
): ThreadMessage =>
  ({
    id,
    role,
    content: [{type: 'text', text}],
    createdAt: new Date(0),
    status: {type: 'complete', reason: 'stop'},
    metadata: {custom: {}},
    attachments: [],
  } as ThreadMessage);

describe('assistant-ui message adapter', () => {
  it('extracts text parts from a message', () => {
    expect(extractMessageText(message('a', 'assistant', '你好'))).toBe('你好');
  });

  it('returns the last user message for the DeepTutor transport', () => {
    const messages = [
      message('u1', 'user', '第一个问题'),
      message('a1', 'assistant', '回答'),
      message('u2', 'user', '第二个问题'),
    ];
    expect(extractLastUserText(messages)).toBe('第二个问题');
  });
});
