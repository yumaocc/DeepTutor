import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import {WebSocketRuntime} from '../src/data/websocket';
import type {WebSocketLike} from '../src/data/websocket';

class FakeSocket implements WebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: {data: string}) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: {code?: number; reason?: string}) => void) | null = null;
  sent: string[] = [];

  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  message(value: unknown) {
    this.onmessage?.({data: JSON.stringify(value)});
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number, reason?: string) {
    this.readyState = 3;
    this.onclose?.({code, reason});
  }
}

describe('WebSocketRuntime', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('authenticates, resumes an active turn and tracks sequence', async () => {
    const sockets: FakeSocket[] = [];
    const events: unknown[] = [];
    const runtime = new WebSocketRuntime({
      url: 'wss://learn.example.com/api/v1/ws',
      getAccessToken: () => 'private-token',
      socketFactory: url => {
        expect(url).toContain('token=private-token');
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      onEvent: event => events.push(event),
    });
    runtime.restoreActiveTurn('turn-1', 4);
    const connecting = runtime.connect();
    await Promise.resolve();
    sockets[0].open();
    await connecting;

    expect(JSON.parse(sockets[0].sent[0])).toEqual({
      type: 'resume_from',
      turn_id: 'turn-1',
      seq: 4,
    });
    sockets[0].message({type: 'content', turn_id: 'turn-1', seq: 5});
    expect(events).toHaveLength(1);
    expect(runtime.cancelTurn()).toBe(true);
    expect(JSON.parse(sockets[0].sent.at(-1)!)).toEqual({
      type: 'cancel_turn',
      turn_id: 'turn-1',
    });
    runtime.close();
  });

  it('suspends in background and reconnects when active', async () => {
    const sockets: FakeSocket[] = [];
    const runtime = new WebSocketRuntime({
      url: 'wss://learn.example.com/api/v1/ws',
      getAccessToken: () => null,
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      onEvent: () => undefined,
    });
    const firstConnect = runtime.connect();
    await Promise.resolve();
    sockets[0].open();
    await firstConnect;

    runtime.setAppActive(false);
    expect(runtime.currentState).toBe('suspended');
    runtime.setAppActive(true);
    await Promise.resolve();
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    runtime.close();
  });
});
