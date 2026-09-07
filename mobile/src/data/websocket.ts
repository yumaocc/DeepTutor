export type WebSocketRuntimeState =
  | 'closed'
  | 'connected'
  | 'connecting'
  | 'idle'
  | 'offline'
  | 'reconnecting'
  | 'suspended';

export interface WebSocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: {data: string}) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: {code?: number; reason?: string}) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface WebSocketRuntimeOptions {
  url: string;
  getAccessToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  socketFactory?: (url: string) => WebSocketLike;
  onEvent: (event: unknown) => void;
  onStateChange?: (state: WebSocketRuntimeState) => void;
  heartbeatIntervalMs?: number;
  staleAfterMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

interface ActiveTurn {
  turnId: string;
  seq: number;
}

const OPEN = 1;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_STALE_AFTER_MS = 45_000;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 1_000;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;
const TERMINAL_EVENT_TYPES = new Set([
  'cancelled',
  'completed',
  'done',
  'failed',
  'turn_cancelled',
  'turn_completed',
  'turn_failed',
]);

let commandSequence = 0;
export function commandId(): string {
  return `mobile-${Date.now()}-${++commandSequence}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function defaultSocketFactory(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export class WebSocketRuntime {
  private state: WebSocketRuntimeState = 'idle';
  private socket: WebSocketLike | null = null;
  private activeTurn: ActiveTurn | null = null;
  private connectPromise: Promise<void> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private lastActivityAt = 0;
  private appActive = true;
  private networkOnline = true;
  private disposed = false;
  private rejectConnection: ((error: Error) => void) | null = null;

  constructor(private readonly options: WebSocketRuntimeOptions) {}

  get currentState(): WebSocketRuntimeState {
    return this.state;
  }

  restoreActiveTurn(turnId: string, seq = 0): void {
    this.activeTurn = {turnId, seq: Math.max(0, seq)};
  }

  clearActiveTurn(): void {
    this.activeTurn = null;
  }

  resumeTurn(): boolean {
    return this.activeTurn
      ? this.send({
          type: 'resume_from',
          turn_id: this.activeTurn.turnId,
          seq: this.activeTurn.seq,
        })
      : false;
  }

  connect(): Promise<void> {
    if (this.socket?.readyState === OPEN) {
      return Promise.resolve();
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    if (this.disposed) {
      return Promise.reject(new Error('WebSocket runtime is closed'));
    }
    if (!this.appActive) {
      this.setState('suspended');
      return Promise.resolve();
    }
    if (!this.networkOnline) {
      this.setState('offline');
      return Promise.resolve();
    }

    this.clearReconnectTimer();
    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    const pending = this.openSocket().finally(() => {
      if (this.connectPromise === pending) {
        this.connectPromise = null;
      }
    });
    this.connectPromise = pending;
    return this.connectPromise;
  }

  setAppActive(active: boolean): void {
    if (this.appActive === active || this.disposed) {
      return;
    }
    this.appActive = active;
    if (!active) {
      this.disconnect('suspended');
      return;
    }
    if (this.networkOnline) {
      this.connect().catch(() => undefined);
    }
  }

  setNetworkOnline(online: boolean): void {
    if (this.networkOnline === online || this.disposed) {
      return;
    }
    this.networkOnline = online;
    if (!online) {
      this.disconnect('offline');
      return;
    }
    if (this.appActive) {
      this.connect().catch(() => undefined);
    }
  }

  send(message: unknown): boolean {
    if (!this.socket || this.socket.readyState !== OPEN) {
      return false;
    }
    try {
      this.socket.send(
        JSON.stringify({
          ...(isRecord(message) ? message : {}),
          protocol_version: '2.0',
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  startTurn(payload: Readonly<Record<string, unknown>>): boolean {
    const sent = this.send({type: 'start_turn', ...payload});
    if (sent && typeof payload.turn_id === 'string') {
      this.activeTurn = {turnId: payload.turn_id, seq: 0};
    }
    return sent;
  }

  cancelTurn(): boolean {
    if (!this.activeTurn) {
      return false;
    }
    return this.send({
      type: 'cancel_turn',
      turn_id: this.activeTurn.turnId,
      command_id: commandId(),
    });
  }

  close(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearReconnectTimer();
    this.disconnect('closed');
  }

  private async openSocket(): Promise<void> {
    const token = await this.options.getAccessToken?.();
    if (this.disposed || !this.appActive || !this.networkOnline) {
      throw new Error('WebSocket connection interrupted');
    }
    const url = new URL(this.options.url);
    if (token) {
      url.searchParams.set('token', token);
    }
    const socket = (this.options.socketFactory ?? defaultSocketFactory)(
      url.toString(),
    );
    this.socket = socket;

    return new Promise<void>((resolve, reject) => {
      this.rejectConnection = reject;
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timed out'));
        socket.close(4000, 'connection timeout');
      }, 15_000);
      let opened = false;
      socket.onopen = () => {
        if (this.socket !== socket || this.disposed) {
          return;
        }
        opened = true;
        clearTimeout(timeout);
        this.rejectConnection = null;
        this.reconnectAttempt = 0;
        this.lastActivityAt = Date.now();
        this.setState('connected');
        this.startHeartbeat();
        if (this.activeTurn) {
          this.send({
            type: 'resume_from',
            turn_id: this.activeTurn.turnId,
            seq: this.activeTurn.seq,
          });
        }
        resolve();
      };
      socket.onmessage = event => this.handleMessage(socket, event.data);
      socket.onerror = () => {
        if (!opened) {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
          socket.close(4000, 'connection failed');
        }
      };
      socket.onclose = event => {
        clearTimeout(timeout);
        if (this.socket !== socket) {
          return;
        }
        this.socket = null;
        this.stopHeartbeat();
        if (!opened) {
          reject(
            new Error(
              event.reason || `WebSocket closed (${event.code ?? 'unknown'})`,
            ),
          );
        }
        if (!this.disposed && this.appActive && this.networkOnline) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private handleMessage(socket: WebSocketLike, data: unknown): void {
    if (this.socket !== socket) {
      return;
    }
    this.lastActivityAt = Date.now();
    let event = data;
    if (typeof data === 'string') {
      try {
        event = JSON.parse(data) as unknown;
      } catch {
        return;
      }
    }
    if (isRecord(event) && event.type === 'pong') {
      return;
    }
    if (isRecord(event)) {
      const turnId = event.turn_id;
      const seq = event.seq;
      if (
        this.activeTurn &&
        turnId === this.activeTurn.turnId &&
        typeof seq === 'number' &&
        seq > 0
      ) {
        if (seq <= this.activeTurn.seq) {
          return;
        }
        this.activeTurn.seq = seq;
      }
    }
    this.options.onEvent(event);
    if (
      isRecord(event) &&
      typeof event.type === 'string' &&
      TERMINAL_EVENT_TYPES.has(event.type) &&
      event.turn_id === this.activeTurn?.turnId
    ) {
      this.activeTurn = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval =
      this.options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    if (interval <= 0) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      const staleAfter = this.options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
      if (Date.now() - this.lastActivityAt > staleAfter) {
        const socket = this.socket;
        if (socket) {
          socket.close(4000, 'stale connection');
        }
        return;
      }
      this.send({type: 'ping'});
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempt += 1;
    this.setState('reconnecting');
    const base =
      this.options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS;
    const maximum =
      this.options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS;
    const delay = Math.min(maximum, base * 2 ** (this.reconnectAttempt - 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => undefined);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private disconnect(state: 'closed' | 'offline' | 'suspended'): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    const socket = this.socket;
    this.rejectConnection?.(new Error('WebSocket connection interrupted'));
    this.rejectConnection = null;
    this.connectPromise = null;
    this.socket = null;
    if (socket) {
      socket.close(1000, state);
    }
    this.setState(state);
  }

  private setState(state: WebSocketRuntimeState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.options.onStateChange?.(state);
  }
}
