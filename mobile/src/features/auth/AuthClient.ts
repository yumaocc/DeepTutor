import type {HttpClient} from '../../data/http';
import {
  authStatusSchema,
  mobileLoginResponseSchema,
  registrationStatusSchema,
  type AuthStatus,
  type MobileLoginResponse,
  type RegistrationStatus,
} from './contracts';

export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  getStatus(signal?: AbortSignal): Promise<AuthStatus> {
    return this.http.request({
      path: '/api/v1/auth/status',
      signal,
      schema: authStatusSchema,
    });
  }

  getRegistrationStatus(signal?: AbortSignal): Promise<RegistrationStatus> {
    return this.http.request({
      path: '/api/v1/auth/is_first_user',
      signal,
      schema: registrationStatusSchema,
    });
  }

  login(
    username: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<MobileLoginResponse> {
    return this.http.request({
      path: '/api/v1/auth/mobile/login',
      method: 'POST',
      body: {username, password},
      signal,
      schema: mobileLoginResponseSchema,
    });
  }
}
