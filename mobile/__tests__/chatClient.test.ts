import {describe, expect, it} from '@jest/globals';
import {ChatClient} from '../src/chat/ChatClient';
import {HttpClient} from '../src/data/http';
import type {WebSocketLike} from '../src/data/websocket';
import {
  historyMessages,
  reduceMessage,
  eventSchema,
  type ChatMessage,
} from '../src/chat/protocol';
import {richContents, safeUrl} from '../src/chat/rich/content';

class Socket implements WebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: {data: string}) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: Record<string, unknown>[] = [];
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  event(type: string, seq: number, rest: Record<string, unknown> = {}) {
    this.onmessage?.({
      data: JSON.stringify({
        type,
        turn_id: 't1',
        session_id: 's1',
        seq,
        protocol_version: '2.0',
        ...rest,
      }),
    });
  }
}
function setup(allowUnversionedEvents = false) {
  const socket = new Socket();
  const http = new HttpClient({
    baseUrl: 'https://example.test',
    fetchImpl: async () =>
      ({
        ok: true,
        status: 200,
        headers: {get: () => 'application/json'},
        text: async () =>
          JSON.stringify({
            id: 's1',
            messages: [{id: 1, role: 'user', content: 'question'}],
          }),
      } as unknown as Response),
  });
  const client = new ChatClient(http, {
    url: 'wss://example.test/ws',
    allowUnversionedEvents,
    socketFactory: () => socket,
    heartbeatIntervalMs: 0,
  });
  return {client, socket};
}
async function start(allowUnversionedEvents = false) {
  const value = setup(allowUnversionedEvents);
  const sent = value.client.send('question');
  await Promise.resolve();
  value.socket.open();
  await sent;
  return value;
}
describe('real chat protocol adapter', () => {
  it('accepts unversioned legacy turn streams only when compatibility is enabled', async () => {
    const {client, socket} = await start(true);
    socket.event('session', 1, {protocol_version: undefined});
    socket.event('content', 2, {protocol_version: undefined, content: 'hello'});
    socket.event('done', 3, {
      protocol_version: undefined,
      metadata: {status: 'completed'},
    });
    expect(client.getSnapshot()).toMatchObject({
      running: false,
      error: null,
      sessionId: 's1',
    });
    expect(client.getSnapshot().messages[1].content).toBe('hello');
    client.dispose();
    const strict = await start();
    strict.socket.event('session', 1, {protocol_version: undefined});
    expect(strict.client.getSnapshot().error).toContain('协议版本不兼容');
    strict.client.dispose();
  });
  it('surfaces legacy start failures and unlocks the composer', async () => {
    const {client, socket} = await start(true);
    socket.event('error', 0, {
      protocol_version: undefined,
      turn_id: '',
      content: 'Model unavailable',
      metadata: {turn_terminal: true},
    });
    expect(client.getSnapshot()).toMatchObject({
      running: false,
      loading: false,
      error: 'Model unavailable',
    });
    client.dispose();
  });
  it('sends v2, adopts server turn IDs, deduplicates replay, replaces final content and reconciles IDs', async () => {
    const {client, socket} = await start();
    expect(socket.sent[0]).toEqual({
      type: 'start_turn',
      content: 'question',
      capability: 'chat',
      session_id: null,
      protocol_version: '2.0',
    });
    socket.event('session', 1);
    socket.event('content', 2, {content: 'partial'});
    socket.event('content', 2, {content: 'duplicate'});
    socket.event('result', 3, {metadata: {response: 'final'}});
    expect(client.getSnapshot().messages[1].content).toBe('final');
    const uiIds = client.getSnapshot().messages.map(m => m.uiId || m.id);
    socket.event('done', 4, {
      metadata: {
        status: 'completed',
        user_message_id: 11,
        assistant_message_id: 12,
      },
    });
    expect(client.getSnapshot().running).toBe(false);
    expect(client.getSnapshot().messages.map(m => m.id)).toEqual(['11', '12']);
    expect(client.getSnapshot().messages.map(m => m.uiId || m.id)).toEqual(
      uiIds,
    );
    client.dispose();
  });
  it('does not treat a recoverable error as terminal; cancellation carries a command ID', async () => {
    const {client, socket} = await start();
    socket.event('session', 1);
    socket.event('error', 2, {content: 'temporary tool failure'});
    expect(client.getSnapshot().running).toBe(true);
    await client.cancel();
    expect(socket.sent.at(-1)).toEqual(
      expect.objectContaining({
        type: 'cancel_turn',
        turn_id: 't1',
        command_id: expect.any(String),
        protocol_version: '2.0',
      }),
    );
    socket.event('done', 3, {metadata: {status: 'cancelled'}});
    expect(client.getSnapshot().messages[1].status).toBe('cancelled');
    client.dispose();
  });
  it('retains charts and generated artifacts from actual result/tool/sources envelopes', async () => {
    const {client, socket} = await start();
    socket.event('session', 1);
    const artifact = {
      url: '/files/outputs/chart.html',
      filename: 'chart.html',
      mime_type: 'text/html',
    };
    socket.event('tool_result', 2, {
      metadata: {tool_metadata: {artifacts: [artifact]}},
    });
    socket.event('sources', 3, {
      metadata: {sources: [{...artifact, type: 'artifact'}]},
    });
    socket.event('result', 4, {
      metadata: {
        render_type: 'echarts',
        payload: {data: {series: [{type: 'bar', data: [1, 2]}]}},
        presentation: {title: '结果'},
      },
    });
    expect(client.getSnapshot().messages[1].attachments).toHaveLength(1);
    expect(richContents(client.getSnapshot().messages[1])[0]).toMatchObject({
      kind: 'echarts',
      title: '结果',
    });
    client.dispose();
  });
  it('resumes structured ask_user only after accepted acknowledgement', async () => {
    const {client, socket} = await start();
    socket.event('session', 1);
    socket.event('tool_result', 2, {
      metadata: {
        tool_metadata: {ask_user: {questions: [{id: 'q', prompt: '选择'}]}},
      },
    });
    expect(client.getSnapshot().waiting).not.toBeNull();
    client.reply([{questionId: 'q', text: 'A'}]);
    const command = socket.sent.at(-1)!;
    expect(command.type).toBe('submit_user_reply');
    expect(client.getSnapshot().waiting).not.toBeNull();
    socket.event('command_ack', 0, {
      command_id: command.command_id,
      accepted: true,
    });
    expect(client.getSnapshot().waiting).toBeNull();
    client.dispose();
  });
  it('handles command rejection without deleting previous answers', async () => {
    const {client, socket} = await start();
    socket.event('session', 1);
    socket.event('content', 2, {content: 'answer'});
    socket.event('done', 3);
    await client.regenerate();
    socket.event('protocol_error', 0, {
      turn_id: '',
      message: 'busy',
      error_code: 'regenerate_rejected',
    });
    expect(client.getSnapshot().messages[1].content).toBe('answer');
    expect(client.getSnapshot().running).toBe(false);
    client.dispose();
  });
  it('loads persisted messages and queries active turn before allowing a new send', async () => {
    const {client, socket} = setup();
    const connected = client.transport.connect();
    await Promise.resolve();
    socket.open();
    await connected;
    await client.loadSession('s1');
    expect(client.getSnapshot().loading).toBe(true);
    socket.event('active_turn_info', 0, {
      turn_id: 't1',
      status: 'waiting_input',
    });
    expect(client.getSnapshot().running).toBe(true);
    expect(socket.sent.at(-1)).toEqual({
      type: 'resume_from',
      turn_id: 't1',
      seq: 0,
      protocol_version: '2.0',
    });
    socket.event('session', 1);
    socket.event('content', 2, {content: 'restored'});
    expect(client.getSnapshot().messages[1].content).toBe('restored');
    client.dispose();
  });
});
const blank: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: '',
  events: [],
  attachments: [],
};
describe('rich history', () => {
  it('uses the same visual extractor for history and streaming', () => {
    const event = eventSchema.parse({
      type: 'result',
      metadata: {render_type: 'html', code: {content: '<h1>Hi</h1>'}},
    });
    const live = reduceMessage(blank, event);
    const saved = historyMessages({
      id: 's',
      title: 't',
      messages: [{id: 1, role: 'assistant', content: '', events: [event]}],
    });
    expect(richContents(saved[0])).toEqual(richContents(live));
  });
  it('only accepts http(s) links and detects fenced chart/webpage content', () => {
    // eslint-disable-next-line no-script-url
    expect(safeUrl('javascript:alert(1)', 'https://example.test')).toBeNull();
    expect(safeUrl('file:///etc/passwd', 'https://example.test')).toBeNull();
    expect(
      safeUrl('https://name:secret@example.test', 'https://example.test'),
    ).toBeNull();
    expect(
      richContents({...blank, content: '```echarts\n{"series":[]}\n```'}),
    ).toHaveLength(1);
  });
});

it('sends image-only turns and keeps images in the local user message', async () => {
  const {client, socket} = setup();
  const images = [
    {type: 'image', filename: 'q.png', mime_type: 'image/png', base64: 'YWJj'},
  ];
  const send = client.send('', 'chat', images);
  await Promise.resolve();
  socket.open();
  await send;
  expect(socket.sent[0]).toMatchObject({
    type: 'start_turn',
    content: '',
    attachments: images,
  });
  expect(client.getSnapshot().messages[0].attachments).toEqual(images);
  expect(client.getSnapshot().running).toBe(true);
  client.dispose();
});
