import {describe, expect, it, jest} from '@jest/globals';

import {HttpClient, HttpError, serverWebSocketPath} from '../src/data/http';
import type {FetchImplementation} from '../src/data/http';
import {AuthClient} from '../src/features/auth/AuthClient';
import {
  authStatusSchema,
  loginResponseSchema,
  registrationStatusSchema,
} from '../src/features/auth/contracts';
import {
  authSessionFromLogin,
  authSessionFromStatus,
  loginErrorMessage,
} from '../src/features/auth/login';

function jsonResponse(status: number, value: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {get: () => 'application/json'},
    text: async () => JSON.stringify(value),
  } as unknown as Response;
}

const loginPayload = {
  ok: true as const,
  user_id: 'u_alice',
  username: 'alice',
  role: 'user',
  is_admin: false,
};

describe('mobile login', () => {
  it('posts credentials to the existing cookie login contract', async () => {
    const fetchImpl = jest.fn<FetchImplementation>(async url =>
      jsonResponse(
        200,
        url.endsWith('/status')
          ? {enabled: true, authenticated: false}
          : loginPayload,
      ),
    );
    const client = new AuthClient(
      new HttpClient({baseUrl: 'https://learn.example.com', fetchImpl}),
    );

    await expect(client.login('alice', 'correct horse')).resolves.toEqual(
      loginPayload,
    );
    const [url, request] = fetchImpl.mock.calls[1];
    expect(url).toBe('https://learn.example.com/api/auth/login');
    expect(request.method).toBe('POST');
    expect(request.credentials).toBe('include');
    expect(JSON.parse(String(request.body))).toEqual({
      username: 'alice',
      password: 'correct horse',
    });
  });

  it('discovers versioned routes before sending credentials and shares them with chat', async () => {
    const server = 'https://versioned.example.com';
    const fetchImpl = jest.fn<FetchImplementation>(async url => {
      if (url.endsWith('/api/auth/status')) {
        return jsonResponse(404, {detail: 'Not Found'});
      }
      if (url.endsWith('/status')) {
        return jsonResponse(200, {enabled: true, authenticated: false});
      }
      if (url.endsWith('/login')) {
        return jsonResponse(200, loginPayload);
      }
      return jsonResponse(200, []);
    });
    await new AuthClient(new HttpClient({baseUrl: server, fetchImpl})).login(
      'alice',
      'secret',
    );
    const nextClient = new HttpClient({baseUrl: server, fetchImpl});
    await nextClient.request({path: '/api/sessions'});
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      server + '/api/auth/status',
      server + '/api/v1/auth/status',
      server + '/api/v1/auth/login',
      server + '/api/v1/sessions',
    ]);
    expect(serverWebSocketPath(server)).toBe('/api/v1/ws');
    expect(serverWebSocketPath('https://learn.example.com')).toBe('/ws');
    expect(
      fetchImpl.mock.calls.filter(([, init]) => init.method === 'POST'),
    ).toHaveLength(1);
  });

  it('does not retry credentials or switch routes after unauthorized responses', async () => {
    const fetchImpl = jest.fn<FetchImplementation>(async url =>
      jsonResponse(
        url.endsWith('/status') ? 200 : 401,
        url.endsWith('/status')
          ? {enabled: true, authenticated: false}
          : {detail: 'Invalid credentials'},
      ),
    );
    const client = new AuthClient(
      new HttpClient({baseUrl: 'https://denied.example.com', fetchImpl}),
    );
    await expect(client.login('alice', 'wrong')).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('validates the identity returned by the cookie login endpoint', () => {
    expect(loginResponseSchema.safeParse(loginPayload).success).toBe(true);
    expect(
      loginResponseSchema.safeParse({...loginPayload, user_id: ''}).success,
    ).toBe(false);
  });

  it('accepts the registration status returned by the backend', () => {
    expect(registrationStatusSchema.parse({is_first_user: false})).toEqual({
      is_first_user: false,
    });
  });

  it('accepts nullable identity fields for unauthenticated users', () => {
    expect(
      authStatusSchema.parse({
        enabled: true,
        authenticated: false,
        user_id: null,
        username: null,
        role: null,
        is_admin: false,
      }),
    ).toMatchObject({enabled: true, authenticated: false, user_id: null});
  });

  it('converts the response to a server-bound cookie session', () => {
    expect(
      authSessionFromLogin(loginPayload, 'https://learn.example.com'),
    ).toEqual({
      authEnabled: true,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      serverAddress: 'https://learn.example.com',
      user: {
        id: 'u_alice',
        username: 'alice',
        role: 'user',
        isAdmin: false,
      },
    });
  });

  it('creates a local session when server authentication is disabled', () => {
    expect(
      authSessionFromStatus(
        {
          enabled: false,
          authenticated: true,
          user_id: 'local-admin',
          username: 'local',
          role: 'admin',
          is_admin: true,
        },
        'http://127.0.0.1:8001',
      ),
    ).toMatchObject({
      authEnabled: false,
      accessToken: null,
      user: {id: 'local-admin', isAdmin: true},
    });
  });

  it('maps credential and connectivity errors to safe user messages', () => {
    expect(
      loginErrorMessage(
        new HttpError('raw backend detail', {
          code: 'http_error',
          status: 401,
          retryable: false,
        }),
      ),
    ).toBe('账号或密码不正确。');
    expect(
      loginErrorMessage(
        new HttpError('socket failed', {
          code: 'network_error',
          retryable: true,
        }),
      ),
    ).toBe('无法连接服务器，请检查网络和服务器地址。');
  });
});
