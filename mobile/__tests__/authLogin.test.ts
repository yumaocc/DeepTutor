import {describe, expect, it, jest} from '@jest/globals';

import {HttpClient, HttpError} from '../src/data/http';
import type {FetchImplementation} from '../src/data/http';
import {AuthClient} from '../src/features/auth/AuthClient';
import {mobileLoginResponseSchema} from '../src/features/auth/contracts';
import {
  authSessionFromLogin,
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
  auth_enabled: true,
  access_token: 'signed-access-token',
  token_type: 'bearer' as const,
  expires_in: 3600,
  user_id: 'u_alice',
  username: 'alice',
  role: 'user',
  is_admin: false,
};

describe('mobile login', () => {
  it('posts credentials to the native login contract', async () => {
    const fetchImpl = jest.fn<FetchImplementation>(async () =>
      jsonResponse(200, loginPayload),
    );
    const client = new AuthClient(
      new HttpClient({baseUrl: 'https://learn.example.com', fetchImpl}),
    );

    await expect(client.login('alice', 'correct horse')).resolves.toEqual(
      loginPayload,
    );
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://learn.example.com/api/v1/auth/mobile/login');
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body))).toEqual({
      username: 'alice',
      password: 'correct horse',
    });
  });

  it('requires a token only when server authentication is enabled', () => {
    expect(
      mobileLoginResponseSchema.safeParse({
        ...loginPayload,
        access_token: null,
      }).success,
    ).toBe(false);
    expect(
      mobileLoginResponseSchema.safeParse({
        ...loginPayload,
        auth_enabled: false,
        access_token: null,
        expires_in: 0,
        user_id: 'local-admin',
        username: 'local',
        role: 'admin',
        is_admin: true,
      }).success,
    ).toBe(true);
  });

  it('converts the response to a server-bound expiring session', () => {
    expect(
      authSessionFromLogin(loginPayload, 'https://learn.example.com', 1000),
    ).toEqual({
      authEnabled: true,
      accessToken: 'signed-access-token',
      refreshToken: null,
      expiresAt: 3_601_000,
      serverAddress: 'https://learn.example.com',
      user: {
        id: 'u_alice',
        username: 'alice',
        role: 'user',
        isAdmin: false,
      },
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
