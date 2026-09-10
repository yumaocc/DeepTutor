import {isHttpError, type HttpClient} from '../../data/http';
import {
  authStatusSchema,
  guestSessionResponseSchema,
  loginResponseSchema,
  registrationStatusSchema,
  type AuthStatus,
  type GuestSessionResponse,
  type LoginResponse,
  type RegistrationStatus,
} from './contracts';

export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  async getStatus(signal?: AbortSignal): Promise<AuthStatus> {
    try {
      const status = await this.http.request({
        path: '/api/auth/status',
        signal,
        schema: authStatusSchema,
        timeoutMs: 12_000,
      });
      this.http.setApiPrefix(this.http.apiPrefix ?? '/api');
      return status;
    } catch (error) {
      if (!isHttpError(error) || error.status !== 404) {
        throw error;
      }
      const prefix = this.http.apiPrefix === '/api/v1' ? '/api' : '/api/v1';
      const status = await this.http.request({
        apiPrefix: prefix,
        path: '/api/auth/status',
        signal,
        schema: authStatusSchema,
        timeoutMs: 12_000,
      });
      this.http.setApiPrefix(prefix);
      return status;
    }
  }

  getRegistrationStatus(signal?: AbortSignal): Promise<RegistrationStatus> {
    return this.http.request({
      path: '/api/auth/is_first_user',
      signal,
      schema: registrationStatusSchema,
    });
  }

  async createGuestSession(
    installationId: string,
    signal?: AbortSignal,
  ): Promise<GuestSessionResponse> {
    if (!this.http.apiPrefix) {
      await this.getStatus(signal);
    }
    return this.http.request({
      path: '/api/auth/guest-session',
      method: 'POST',
      body: {
        client_type: 'mobile',
        installation_id: installationId,
      },
      signal,
      schema: guestSessionResponseSchema,
    });
  }

  async login(
    username: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<LoginResponse> {
    if (!this.http.apiPrefix) {
      await this.getStatus(signal);
    }
    return this.http.request({
      path: '/api/auth/login',
      method: 'POST',
      body: {username, password},
      signal,
      schema: loginResponseSchema,
    });
  }
}
