import {z} from 'zod';

const serverAddressSchema = z
  .string()
  .trim()
  .min(1, 'Server address is required');

export interface RuntimeConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
}

export class RuntimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

export function normalizeServerAddress(input: string): string {
  const parsedInput = serverAddressSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new RuntimeConfigError(
      parsedInput.error.issues[0]?.message ?? 'Invalid server address',
    );
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//iu.test(parsedInput.data)
    ? parsedInput.data
    : `http://${parsedInput.data}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new RuntimeConfigError('Server address is not a valid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new RuntimeConfigError('Server address must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw new RuntimeConfigError('Server address must not contain credentials');
  }
  if (url.search || url.hash) {
    throw new RuntimeConfigError(
      'Server address must not contain query parameters or fragments',
    );
  }

  url.pathname = url.pathname.replace(/\/+$/u, '');
  return url.toString().replace(/\/$/u, '');
}

export function createRuntimeConfig(serverAddress: string): RuntimeConfig {
  const apiBaseUrl = normalizeServerAddress(serverAddress);
  const wsUrl = new URL(apiBaseUrl);
  wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return {
    apiBaseUrl,
    wsBaseUrl: wsUrl.toString().replace(/\/$/u, ''),
  };
}
