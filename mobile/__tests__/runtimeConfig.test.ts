import {describe, expect, it} from '@jest/globals';

import {
  createRuntimeConfig,
  normalizeServerAddress,
  RuntimeConfigError,
} from '../src/config/runtime';

describe('runtime server configuration', () => {
  it('normalizes a host and derives the websocket origin', () => {
    expect(createRuntimeConfig('127.0.0.1:8001/')).toEqual({
      apiBaseUrl: 'http://127.0.0.1:8001',
      wsBaseUrl: 'ws://127.0.0.1:8001',
    });
    expect(createRuntimeConfig('https://learn.example.com/base/')).toEqual({
      apiBaseUrl: 'https://learn.example.com/base',
      wsBaseUrl: 'wss://learn.example.com/base',
    });
  });

  it('rejects credentials and non-http protocols', () => {
    expect(() => normalizeServerAddress('ftp://example.com')).toThrow(
      RuntimeConfigError,
    );
    expect(() =>
      normalizeServerAddress('https://user:pass@example.com'),
    ).toThrow('must not contain credentials');
  });
});
