export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: string;
  context?: unknown;
}

export interface LogSink {
  write(record: LogRecord): void;
}

const SECRET_KEY =
  /authorization|cookie|password|secret|token|credential|api[-_]?key/iu;
const BEARER_VALUE = /bearer\s+[a-z\d._~+/=-]+/giu;
const MAX_DEPTH = 6;

function redactString(value: string): string {
  return value.replace(BEARER_VALUE, 'Bearer [REDACTED]');
}

export function redactLogValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH]';
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.map(item => redactLogValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY.test(key)
        ? '[REDACTED]'
        : redactLogValue(item, depth + 1, seen),
    ]),
  );
}

class ConsoleLogSink implements LogSink {
  write(record: LogRecord): void {
    const method = record.level === 'debug' ? 'log' : record.level;
    console[method](
      `[${record.scope}] ${record.message}`,
      record.context ?? '',
    );
  }
}

export class Logger {
  constructor(
    private readonly scope: string,
    private readonly sinks: readonly LogSink[],
  ) {}

  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`, this.sinks);
  }

  debug(message: string, context?: unknown): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: unknown): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: unknown): void {
    const record: LogRecord = {
      level,
      scope: this.scope,
      message: redactString(message),
      timestamp: new Date().toISOString(),
      context: context === undefined ? undefined : redactLogValue(context),
    };
    this.sinks.forEach(sink => sink.write(record));
  }
}

export const appLogger = new Logger(
  'deeptutor-mobile',
  typeof __DEV__ !== 'undefined' && __DEV__ ? [new ConsoleLogSink()] : [],
);
