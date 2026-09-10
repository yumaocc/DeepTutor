import {z} from 'zod';
import type {DeepTutorChatPort} from './DeepTutorChatPort';
import {HttpClient} from '../data/http';
import {
  commandId,
  WebSocketRuntime,
  type WebSocketRuntimeOptions,
  type WebSocketRuntimeState,
} from '../data/websocket';
import {
  eventSchema,
  historyMessages,
  reduceMessage,
  record,
  sessionSchema,
  sessionSummarySchema,
  type ChatMessage,
  type ChatAttachment,
  type ChatEvent,
  type SessionSummary,
} from './protocol';

export interface ChatSnapshot {
  messages: ChatMessage[];
  sessionId: string | null;
  running: boolean;
  loading: boolean;
  connection: WebSocketRuntimeState;
  error: string | null;
  waiting: ChatEvent | null;
  llmSelection: LlmSelection | null;
}
export interface LlmSelection {
  profile_id: string;
  model_id: string;
}
export interface LlmOption extends LlmSelection {
  profile_name: string;
  model_name: string;
  provider_label?: string;
  is_active_default?: boolean;
}
export class ChatClient implements DeepTutorChatPort {
  private snapshot: ChatSnapshot = {
    messages: [],
    sessionId: null,
    running: false,
    loading: false,
    connection: 'idle',
    error: null,
    waiting: null,
    llmSelection: null,
  };
  private listeners = new Set<() => void>();
  readonly transport: WebSocketRuntime;
  private turnId: string | null = null;
  private assistantId: string | null = null;
  private userId: string | null = null;
  private generation = 0;
  private disposed = false;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private command: {id: string; type: string} | null = null;
  constructor(
    private http: HttpClient,
    private options: Omit<
      WebSocketRuntimeOptions,
      'onEvent' | 'onStateChange'
    > & {allowUnversionedEvents?: boolean},
  ) {
    this.transport = new WebSocketRuntime({
      ...options,
      onEvent: raw => this.receive(raw),
      onStateChange: connection => this.update({connection}),
    });
  }
  getSnapshot = (): ChatSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private update(patch: Partial<ChatSnapshot>) {
    if (this.disposed) {
      return;
    }
    this.snapshot = {...this.snapshot, ...patch};
    this.listeners.forEach(fn => fn());
  }
  private clearTimer() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }
  private fail(error: unknown) {
    this.clearTimer();
    this.update({
      error: error instanceof Error ? error.message : '请求失败，请重试。',
      loading: false,
    });
  }
  async listSessions(offset = 0): Promise<SessionSummary[]> {
    const result = await this.http.request({
      path: '/api/sessions',
      query: {limit: 30, offset},
      schema: z.object({sessions: z.array(sessionSummarySchema)}),
    });
    return result.sessions;
  }
  async listLlmOptions(): Promise<LlmOption[]> {
    const result = await this.http.request({
      path: '/api/settings/llm-options',
      schema: z.object({
        active: z
          .object({profile_id: z.string(), model_id: z.string()})
          .nullable()
          .optional(),
        options: z.array(
          z.object({
            profile_id: z.string(),
            model_id: z.string(),
            profile_name: z.string(),
            model_name: z.string(),
            provider_label: z.string().optional(),
            is_active_default: z.boolean().optional(),
          }),
        ),
      }),
    });
    if (!this.snapshot.llmSelection && result.active) {
      this.update({llmSelection: result.active});
    }
    return result.options;
  }
  selectLlm(selection: LlmSelection) {
    this.update({llmSelection: selection});
  }
  newSession() {
    if (this.snapshot.running || this.snapshot.loading) {
      return;
    }
    this.generation++;
    this.turnId = null;
    this.transport.clearActiveTurn();
    this.update({messages: [], sessionId: null, error: null, waiting: null});
  }
  async loadSession(id: string) {
    if (this.snapshot.running || this.snapshot.loading) {
      return;
    }
    const generation = ++this.generation;
    this.update({loading: true, error: null});
    try {
      const session = await this.http.request({
        path: `/api/sessions/${encodeURIComponent(id)}`,
        schema: sessionSchema,
      });
      if (generation !== this.generation || this.disposed) {
        return;
      }
      this.turnId = null;
      this.transport.clearActiveTurn();
      this.update({
        sessionId: id,
        messages: historyMessages(session),
        waiting: null,
        llmSelection:
          session.preferences?.llm_selection &&
          typeof session.preferences.llm_selection === 'object'
            ? {
                profile_id: String(
                  record(session.preferences.llm_selection).profile_id || '',
                ),
                model_id: String(
                  record(session.preferences.llm_selection).model_id || '',
                ),
              }
            : this.snapshot.llmSelection,
      });
      await this.transport.connect();
      if (generation !== this.generation || this.disposed) {
        return;
      }
      // Query the server instead of guessing whether an interrupted turn still exists.
      if (!this.transport.send({type: 'check_active_turn', session_id: id})) {
        throw new Error('连接尚未就绪，请重试。');
      }
      this.pendingTimer = setTimeout(() => {
        this.fail(new Error('查询活跃对话超时，请重新加载会话。'));
      }, 15000);
    } catch (error) {
      if (generation === this.generation) {
        this.fail(error);
      }
    }
  }
  async send(
    content: string,
    capability = 'chat',
    attachments: ChatAttachment[] = [],
  ) {
    if (
      (!content.trim() && !attachments.length) ||
      this.snapshot.running ||
      this.snapshot.loading
    ) {
      return;
    }
    this.update({loading: true, error: null});
    try {
      await this.transport.connect();
      if (this.disposed) {
        return;
      }
      this.userId = commandId();
      this.assistantId = commandId();
      this.turnId = null;
      const messages: ChatMessage[] = [
        ...this.snapshot.messages,
        {id: this.userId, role: 'user', content, events: [], attachments},
        {
          id: this.assistantId,
          role: 'assistant',
          content: '',
          events: [],
          attachments: [],
          status: 'running',
        },
      ];
      if (
        !this.transport.startTurn({
          content,
          capability,
          ...(attachments.length ? {attachments} : {}),
          ...(this.snapshot.llmSelection
            ? {llm_selection: this.snapshot.llmSelection}
            : {}),
          session_id: this.snapshot.sessionId,
        })
      ) {
        throw new Error('当前连接不可用，输入尚未发送。');
      }
      this.update({messages, running: true, loading: false, waiting: null});
      this.awaitSession();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }
  private awaitSession() {
    this.clearTimer();
    this.pendingTimer = setTimeout(() => {
      // A lost start response is ambiguous: do not silently replay a mutating command.
      this.update({
        error: '尚未收到服务器确认。请检查历史会话后继续，避免重复发送。',
        running: false,
        messages: this.snapshot.messages.map(m =>
          m.id === this.assistantId ? {...m, status: 'error'} : m,
        ),
      });
      if (this.snapshot.sessionId) {
        this.transport.send({
          type: 'check_active_turn',
          session_id: this.snapshot.sessionId,
        });
      }
    }, 20000);
  }
  async regenerate() {
    if (
      this.snapshot.running ||
      this.snapshot.loading ||
      !this.snapshot.sessionId
    ) {
      return;
    }
    this.update({loading: true, error: null});
    try {
      await this.transport.connect();
      if (
        !this.transport.send({
          type: 'regenerate',
          session_id: this.snapshot.sessionId,
        })
      ) {
        throw new Error('当前连接不可用。');
      }
      this.assistantId = commandId();
      this.userId = null;
      this.turnId = null;
      // Keep the previous answer until the new run is accepted; rejection never loses content.
      this.update({running: true, loading: false});
      this.awaitSession();
    } catch (error) {
      this.fail(error);
    }
  }
  async cancel() {
    this.sendCommand('cancel_turn', {});
  }
  async reconnect() {
    this.update({error: null});
    try {
      await this.transport.connect();
      if (this.turnId) {
        this.transport.resumeTurn();
      } else if (this.snapshot.sessionId && !this.snapshot.running) {
        await this.loadSession(this.snapshot.sessionId);
      }
    } catch (error) {
      this.fail(error);
    }
  }
  reply(answers: {questionId: string; text: string}[]) {
    if (this.snapshot.waiting?.type === 'wait_for_input') {
      this.sendCommand('user_input', {
        content: answers.map(a => a.text).join('\n'),
      });
    } else {
      this.sendCommand('submit_user_reply', {answers});
    }
  }
  private sendCommand(type: string, payload: Record<string, unknown>) {
    if (!this.turnId) {
      this.update({error: '等待服务器确认回合后再操作。'});
      return;
    }
    const id = commandId();
    if (
      !this.transport.send({
        type,
        ...payload,
        turn_id: this.turnId,
        command_id: id,
      })
    ) {
      this.update({error: '连接已断开，操作未发送。恢复连接后请重试。'});
      return;
    }
    this.command = {id, type};
    this.update({error: null});
  }
  private receive(raw: unknown) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) {
      this.update({error: '服务器消息格式不兼容。'});
      return;
    }
    const e = parsed.data;
    if (e.protocol_version !== '2.0' && !this.options.allowUnversionedEvents) {
      this.update({error: '服务器流式协议版本不兼容。'});
      return;
    }
    // Older deployments emit command failures as error events, before a turn exists.
    if (
      e.type === 'error' &&
      (!e.turn_id || e.metadata.turn_terminal === true)
    ) {
      if (e.turn_id && this.turnId && e.turn_id !== this.turnId) {
        return;
      }
      this.fail(new Error(e.content || '服务器拒绝了请求。'));
      if (!this.turnId || e.metadata.turn_terminal === true) {
        this.update({
          running: false,
          waiting: null,
          messages: this.snapshot.messages.map(m =>
            m.id === this.assistantId ? {...m, status: 'error'} : m,
          ),
        });
        this.transport.clearActiveTurn();
        this.turnId = null;
      }
      return;
    }
    if (e.type === 'command_ack') {
      if (e.command_id !== this.command?.id) {
        return;
      }
      if (e.accepted !== true) {
        this.update({error: String(e.message || '操作未被接受，请重试。')});
      } else if (
        ['submit_user_reply', 'user_input'].includes(this.command?.type || '')
      ) {
        this.update({waiting: null});
      }
      this.command = null;
      return;
    }
    if (e.type === 'protocol_error') {
      if (e.turn_id && this.turnId && e.turn_id !== this.turnId) {
        return;
      }
      this.fail(new Error(String(e.message || '服务器拒绝了请求。')));
      if (!this.turnId) {
        this.update({
          running: false,
          messages: this.snapshot.messages.map(m =>
            m.id === this.assistantId ? {...m, status: 'error'} : m,
          ),
        });
      }
      return;
    }
    if (e.type === 'active_turn_info') {
      this.clearTimer();
      this.update({loading: false});
      if (
        e.turn_id &&
        ['running', 'queued', 'waiting_input', 'recovering'].includes(
          String(e.status),
        )
      ) {
        this.turnId = e.turn_id;
        this.assistantId = commandId();
        this.userId = null;
        this.update({
          running: true,
          messages: [
            ...this.snapshot.messages,
            {
              id: this.assistantId,
              role: 'assistant',
              content: '',
              events: [],
              attachments: [],
              status: 'running',
            },
          ],
        });
        this.transport.restoreActiveTurn(e.turn_id, 0);
        this.transport.send({type: 'resume_from', turn_id: e.turn_id, seq: 0});
      } else if (this.snapshot.running && !this.turnId) {
        this.update({running: false});
      }
      return;
    }
    if (!this.snapshot.running) {
      return;
    }
    if (this.turnId && e.turn_id !== this.turnId) {
      return;
    }
    if (!this.turnId) {
      if (e.type !== 'session' || !e.turn_id || !e.session_id) {
        return;
      }
      this.clearTimer();
      this.turnId = e.turn_id;
      this.transport.restoreActiveTurn(e.turn_id, e.seq ?? 0);
      this.update({sessionId: e.session_id});
      if (e.metadata.regenerated_from_message_id) {
        this.update({
          messages: this.snapshot.messages.filter(
            m => m.id !== String(e.metadata.regenerated_from_message_id),
          ),
        });
      }
      if (!this.snapshot.messages.some(m => m.id === this.assistantId)) {
        this.update({
          messages: [
            ...this.snapshot.messages,
            {
              id: this.assistantId!,
              role: 'assistant',
              content: '',
              events: [],
              attachments: [],
              status: 'running',
            },
          ],
        });
      }
    }
    this.update({
      messages: this.snapshot.messages.map(m =>
        m.id === this.assistantId ? reduceMessage(m, e) : m,
      ),
      ...(e.type === 'wait_for_input' ||
      (e.type === 'tool_result' &&
        (e.metadata.ask_user || record(e.metadata.tool_metadata).ask_user))
        ? {waiting: e}
        : {}),
      ...(e.metadata.ask_user_resolved ? {waiting: null} : {}),
      ...(e.type === 'error' ? {error: e.content || '生成遇到错误。'} : {}),
    });
    if (e.type === 'done') {
      this.clearTimer();
      this.update({
        running: false,
        waiting: null,
        messages: this.snapshot.messages.map(m => ({
          ...m,
          uiId: m.uiId || m.id,
          id:
            m.id === this.assistantId && e.metadata.assistant_message_id
              ? String(e.metadata.assistant_message_id)
              : m.id === this.userId && e.metadata.user_message_id
              ? String(e.metadata.user_message_id)
              : m.id,
        })),
      });
      this.transport.send({type: 'unsubscribe', turn_id: this.turnId});
      this.turnId = null;
    }
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.clearTimer();
    this.transport.close();
    this.listeners.clear();
  }
}
