import type {ThreadMessage} from '@assistant-ui/react-native';

export function extractMessageText(message: ThreadMessage): string {
  return message.content
    .flatMap(part => (part.type === 'text' ? [part.text] : []))
    .join('');
}

export function extractLastUserText(
  messages: readonly ThreadMessage[],
): string {
  const message = [...messages].reverse().find(item => item.role === 'user');
  return message ? extractMessageText(message) : '';
}
