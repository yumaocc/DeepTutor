import {record, type ChatMessage} from '../protocol';
export interface RichContent {
  kind: string;
  title: string;
  content: string;
  summary?: string;
  url?: string;
}
export function safeUrl(raw: string, server: string): string | null {
  try {
    const url = new URL(raw, `${server}/`);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
export function richContents(message: ChatMessage): RichContent[] {
  const result: RichContent[] = [];
  for (const event of message.events) {
    if (event.type !== 'result') {
      continue;
    }
    const meta = event.metadata;
    if (typeof meta.render_type !== 'string') {
      continue;
    }
    const payload = record(meta.payload);
    const code = record(meta.code);
    const presentation = record(meta.presentation);
    const value = payload.data ?? code.content ?? meta.fallback ?? meta;
    const nativeRenderer = record(meta.renderer).native_renderer;
    if (value != null) {
      result.push({
        kind:
          typeof nativeRenderer === 'string' && nativeRenderer
            ? nativeRenderer
            : meta.render_type,
        title: String(presentation.title || meta.render_type),
        content: typeof value === 'string' ? value : JSON.stringify(value),
        summary: String(
          presentation.alt_text || presentation.description || '',
        ),
      });
    }
  }
  const fences =
    /```(echarts|chartjs|chart\.js|html|svg|mermaid)\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fences.exec(message.content))) {
    const item = {
      kind: match[1].toLowerCase().replace('chart.js', 'chartjs'),
      title: match[1],
      content: match[2],
    };
    if (
      !result.some(
        r => r.kind === item.kind && r.content.trim() === item.content.trim(),
      )
    ) {
      result.push(item);
    }
  }
  return result;
}
