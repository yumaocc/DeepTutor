import {z} from 'zod';

export const attachmentSchema = z
  .object({
    type: z.string(),
    filename: z.string().optional(),
    url: z.string().optional(),
    base64: z.string().optional(),
    mime_type: z.string().optional(),
  })
  .passthrough();
export type ChatAttachment = z.infer<typeof attachmentSchema>;
export const eventSchema = z
  .object({
    type: z.string(),
    content: z.string().default(''),
    metadata: z.record(z.string(), z.unknown()).default({}),
    session_id: z.string().optional(),
    turn_id: z.string().optional(),
    seq: z.number().int().nonnegative().optional(),
    protocol_version: z.literal('2.0').optional(),
  })
  .passthrough();
export type ChatEvent = z.infer<typeof eventSchema>;
export interface ChatMessage {
  id: string;
  /** Stable list identity when the server assigns the persisted message ID. */
  uiId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  events: ChatEvent[];
  attachments: ChatAttachment[];
  status?: 'running' | 'complete' | 'cancelled' | 'error';
}
export const sessionSummarySchema = z
  .object({
    id: z.string(),
    title: z.string().default('未命名对话'),
    active_turn_id: z.string().optional(),
  })
  .passthrough();
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export const sessionSchema = sessionSummarySchema.extend({
  messages: z.array(
    z
      .object({
        id: z.union([z.number(), z.string()]),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().default(''),
        events: z.array(eventSchema).nullish(),
        attachments: z.array(attachmentSchema).nullish(),
        parent_message_id: z.number().nullable().optional(),
      })
      .passthrough(),
  ),
  preferences: z.record(z.string(), z.unknown()).optional(),
});
export type SessionDetail = z.infer<typeof sessionSchema>;
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Stream chunks append; authoritative result replaces, never duplicates, the answer. */
export function reduceMessage(
  message: ChatMessage,
  event: ChatEvent,
): ChatMessage {
  let content = message.content;
  if (event.type === 'content') {
    content += event.content;
  }
  if (event.type === 'result') {
    const response = event.metadata.response;
    if (typeof response === 'string' && response) {
      content = response;
    } else if (event.content) {
      content = event.content;
    }
  }
  const attachments = [...message.attachments];
  const tool = record(event.metadata.tool_metadata);
  const artifacts =
    event.type === 'tool_result' && Array.isArray(tool.artifacts)
      ? tool.artifacts
      : event.type === 'sources' && Array.isArray(event.metadata.sources)
      ? event.metadata.sources.filter(a => record(a).type === 'artifact')
      : [];
  const candidates = [
    ...(Array.isArray(event.metadata.attachments)
      ? event.metadata.attachments
      : []),
    ...artifacts.map(raw => {
      const a = record(raw);
      return {
        ...a,
        type: String(a.mime_type || '').startsWith('image/')
          ? 'image'
          : 'document',
      };
    }),
  ];
  if (candidates.length) {
    for (const raw of candidates) {
      const parsed = attachmentSchema.safeParse(raw);
      if (
        parsed.success &&
        !attachments.some(
          a =>
            (a.url && a.url === parsed.data.url) ||
            JSON.stringify(a) === JSON.stringify(parsed.data),
        )
      ) {
        attachments.push(parsed.data);
      }
    }
  }
  return {
    ...message,
    content,
    attachments,
    events: [...message.events, event],
    status:
      event.type === 'done'
        ? event.metadata.status === 'cancelled'
          ? 'cancelled'
          : event.metadata.status === 'failed'
          ? 'error'
          : 'complete'
        : message.status,
  };
}

export function historyMessages(session: SessionDetail): ChatMessage[] {
  const all = session.messages;
  // Respect the selected branch when parent links exist; legacy rows stay linear.
  let visible = all;
  if (all.some(m => m.parent_message_id != null)) {
    const branches = record(session.preferences?.selected_branches);
    visible = [];
    let parent: number | null = null;
    const seen = new Set<string>();
    while (true) {
      const siblings = all.filter(
        m => (m.parent_message_id ?? null) === parent,
      );
      const next =
        siblings.find(m => String(m.id) === String(branches[String(parent)])) ??
        siblings[siblings.length - 1];
      if (!next || seen.has(String(next.id))) {
        break;
      }
      visible.push(next);
      seen.add(String(next.id));
      parent = Number(next.id);
    }
  }
  return visible.map(m => ({
    id: String(m.id),
    role: m.role,
    content: m.content,
    events: m.events ?? [],
    attachments: m.attachments ?? [],
    status: 'complete',
  }));
}
