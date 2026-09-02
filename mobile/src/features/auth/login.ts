import {HttpError, isHttpError} from '../../data/http';
import type {AuthSession} from './AuthSessionRepository';
import type {MobileLoginResponse} from './contracts';

export function authSessionFromLogin(
  response: MobileLoginResponse,
  serverAddress: string,
  now = Date.now(),
): AuthSession {
  return {
    authEnabled: response.auth_enabled,
    accessToken: response.access_token,
    refreshToken: null,
    expiresAt:
      response.expires_in > 0 ? now + response.expires_in * 1000 : null,
    serverAddress,
    user: {
      id: response.user_id,
      username: response.username,
      role: response.role,
      isAdmin: response.is_admin,
    },
  };
}

export function loginErrorMessage(error: unknown): string {
  if (!isHttpError(error)) {
    return '登录时出现意外问题，请重试。';
  }
  if (error.code === 'network_error' || error.code === 'request_timeout') {
    return '无法连接服务器，请检查网络和服务器地址。';
  }
  if (error.code === 'request_cancelled') {
    return '';
  }
  switch (error.status) {
    case 401:
      return '账号或密码不正确。';
    case 403:
      return '这个账号没有登录权限，请联系管理员。';
    case 422:
      return '请输入有效的账号和密码。';
    case 429:
      return '尝试次数过多，请稍后再试。';
    default:
      return error.status && error.status >= 500
        ? '服务器暂时不可用，请稍后再试。'
        : '登录失败，请检查输入后重试。';
  }
}

export function isLoginCancellation(error: unknown): boolean {
  return error instanceof HttpError && error.code === 'request_cancelled';
}
