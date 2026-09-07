export type HttpErrorCode =
  | 'http_error'
  | 'invalid_response'
  | 'network_error'
  | 'request_cancelled'
  | 'request_timeout';

export interface HttpErrorOptions {
  code: HttpErrorCode;
  retryable: boolean;
  status?: number;
  requestId?: string;
  cause?: unknown;
}

export class HttpError extends Error {
  readonly code: HttpErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly cause?: unknown;

  constructor(message: string, options: HttpErrorOptions) {
    super(message);
    this.name = 'HttpError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
    this.requestId = options.requestId;
    this.cause = options.cause;

    // Required by older JavaScript engines when extending built-in classes.
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export type FetchImplementation = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

type QueryPrimitive = string | number | boolean;
type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | readonly (QueryPrimitive | null | undefined)[];

export interface ResponseSchema<T> {
  parse(value: unknown): T;
}

export interface HttpRequestOptions<T> {
  apiPrefix?: '/api' | '/api/v1';
  path: string;
  method?: string;
  query?: Readonly<Record<string, QueryValue>>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  timeoutMs?: number;
  schema?: ResponseSchema<T>;
}

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  onUnauthorized?: () => void | Promise<void>;
  fetchImpl?: FetchImplementation;
  defaultTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const JSON_CONTENT_TYPE = /(?:^|[/+])json(?:$|\s*;)/iu;

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function hasHeader(headers: Readonly<Record<string, string>>, name: string) {
  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some(
    headerName => headerName.toLowerCase() === normalizedName,
  );
}

function appendQuery(url: URL, query?: Readonly<Record<string, QueryValue>>) {
  if (!query) {
    return;
  }
  Object.entries(query).forEach(([key, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach(value => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  });
}

function responseRequestId(response: Response): string | undefined {
  return (
    response.headers.get('x-request-id') ??
    response.headers.get('x-correlation-id') ??
    undefined
  );
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error']) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim().slice(0, 512);
  }
  return `Request failed with status ${status}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const looksLikeJson = /^[\s]*[{[]/u.test(text);
  if (JSON_CONTENT_TYPE.test(contentType) || looksLikeJson) {
    try {
      return JSON.parse(text) as unknown;
    } catch (cause) {
      throw new HttpError('Server returned invalid JSON', {
        code: 'invalid_response',
        status: response.status,
        requestId: responseRequestId(response),
        retryable: false,
        cause,
      });
    }
  }
  return text;
}

// Routes are discovered with a read-only auth status request, never by replaying writes.
const apiPrefixes = new Map<string, '/api' | '/api/v1'>();

export function serverWebSocketPath(server: string): string {
  return apiPrefixes.get(server.replace(/\/+$/u, '')) === '/api/v1'
    ? '/api/v1/ws'
    : '/ws';
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: HttpClientOptions['getAccessToken'];
  private readonly onUnauthorized?: HttpClientOptions['onUnauthorized'];
  private readonly fetchImpl: FetchImplementation;
  private readonly defaultTimeoutMs: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.getAccessToken = options.getAccessToken;
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get apiPrefix(): '/api' | '/api/v1' | undefined {
    return apiPrefixes.get(this.baseUrl);
  }

  setApiPrefix(prefix: '/api' | '/api/v1'): void {
    apiPrefixes.set(this.baseUrl, prefix);
  }

  async request<T = unknown>(options: HttpRequestOptions<T>): Promise<T> {
    const path =
      (options.apiPrefix ?? this.apiPrefix) === '/api/v1'
        ? options.path.replace(/^\/api\/(?!v1(?:\/|$))/u, '/api/v1/')
        : options.path;
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, '')}`);
    appendQuery(url, options.query);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };
    const accessToken = await this.getAccessToken?.();
    if (accessToken && !hasHeader(headers, 'authorization')) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let body: RequestInit['body'];
    if (options.body !== undefined) {
      if (isFormData(options.body)) {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
        if (!hasHeader(headers, 'content-type')) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const controller = new AbortController();
    let timedOut = false;
    let cancelled = false;
    const cancelFromCaller = () => {
      cancelled = true;
      controller.abort();
    };

    if (options.signal?.aborted) {
      cancelFromCaller();
    } else {
      options.signal?.addEventListener('abort', cancelFromCaller, {once: true});
    }

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : undefined;

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: (options.method ?? 'GET').toUpperCase(),
        headers,
        body,
        signal: controller.signal,
        credentials: 'include',
      });
    } catch (cause) {
      if (timedOut) {
        throw new HttpError('Request timed out', {
          code: 'request_timeout',
          retryable: true,
          cause,
        });
      }
      if (cancelled || options.signal?.aborted) {
        throw new HttpError('Request was cancelled', {
          code: 'request_cancelled',
          retryable: false,
          cause,
        });
      }
      throw new HttpError('Unable to connect to the server', {
        code: 'network_error',
        retryable: true,
        cause,
      });
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      options.signal?.removeEventListener('abort', cancelFromCaller);
    }

    const payload = await parseResponseBody(response);
    const requestId = responseRequestId(response);
    if (!response.ok) {
      if (response.status === 401) {
        try {
          await this.onUnauthorized?.();
        } catch {
          // Authentication cleanup must not replace the original HTTP error.
        }
      }
      throw new HttpError(errorMessage(payload, response.status), {
        code: 'http_error',
        status: response.status,
        requestId,
        retryable: retryableStatus(response.status),
      });
    }

    if (!options.schema) {
      return payload as T;
    }
    try {
      return options.schema.parse(payload);
    } catch (cause) {
      throw new HttpError('Server response did not match the expected format', {
        code: 'invalid_response',
        status: response.status,
        requestId,
        retryable: false,
        cause,
      });
    }
  }
}
