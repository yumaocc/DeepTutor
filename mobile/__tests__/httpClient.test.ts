import {describe, expect, it, jest} from '@jest/globals';
import {z} from 'zod';

import {HttpClient} from '../src/data/http';
import type {FetchImplementation} from '../src/data/http';

function jsonResponse(status: number, value: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    text: async () => JSON.stringify(value),
  } as Response;
}

describe('HttpClient', () => {
  it('adds query parameters, bearer auth and validates JSON', async () => {
    const fetchImpl = jest.fn<FetchImplementation>(async () =>
      jsonResponse(200, {name: 'DeepTutor'}),
    );
    const client = new HttpClient({
      baseUrl: 'https://api.example.com/',
      getAccessToken: () => 'secret-token',
      fetchImpl,
    });

    await expect(
      client.request({
        path: '/api/v1/profile',
        query: {limit: 20, tag: ['math', 'science'], empty: undefined},
        schema: z.object({name: z.string()}),
      }),
    ).resolves.toEqual({name: 'DeepTutor'});

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/profile?limit=20&tag=math&tag=science',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('maps HTTP errors and invokes the unauthorized callback', async () => {
    const onUnauthorized = jest.fn<() => void>();
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      onUnauthorized,
      fetchImpl: async () => jsonResponse(401, {detail: 'Session expired'}),
    });

    await expect(client.request({path: '/private'})).rejects.toMatchObject({
      code: 'http_error',
      status: 401,
      message: 'Session expired',
      retryable: false,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('cancels a request when its timeout expires', async () => {
    jest.useFakeTimers();
    const fetchImpl: FetchImplementation = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      });
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetchImpl,
    });
    const request = client.request({path: '/slow', timeoutMs: 50});
    const handledRequest = request.then(
      () => ({code: 'unexpected_success', retryable: false}),
      error => error as {code: string; retryable: boolean},
    );

    await jest.advanceTimersByTimeAsync(50);
    await expect(handledRequest).resolves.toEqual(
      expect.objectContaining({
        code: 'request_timeout',
        retryable: true,
      }),
    );
    jest.useRealTimers();
  });
});
