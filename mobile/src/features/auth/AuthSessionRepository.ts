import {z} from 'zod';

import type {KeyValueStorage} from '../../platform/storage/types';
import {VersionedRepository} from '../../platform/storage/VersionedRepository';

const authSessionSchema = z.object({
  authEnabled: z.boolean(),
  accessToken: z.string().min(1).nullable(),
  refreshToken: z.string().min(1).nullable(),
  expiresAt: z.number().int().positive().nullable(),
  serverAddress: z.string().url(),
  subjectType: z.enum(['account', 'guest', 'local']),
  trial: z
    .object({
      enabled: z.boolean(),
      status: z.string(),
      turns_used: z.number().int().nonnegative(),
      turns_limit: z.number().int().positive(),
      turns_remaining: z.number().int().nonnegative(),
      tokens_used: z.number().int().nonnegative(),
      tokens_limit: z.number().int().positive(),
      tokens_remaining: z.number().int().nonnegative(),
      cost_used_usd: z.number().nonnegative(),
      cost_limit_usd: z.number().nonnegative(),
      expires_at: z.number().positive(),
    })
    .nullable(),
  user: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    role: z.string().min(1),
    isAdmin: z.boolean(),
  }),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export class AuthSessionRepository extends VersionedRepository<AuthSession> {
  constructor(storage: KeyValueStorage) {
    super({
      storage,
      key: 'deeptutor.mobile.auth-session',
      version: 2,
      schema: authSessionSchema,
      migrate: envelope => {
        if (envelope.version !== 1 || typeof envelope.data !== 'object') {
          return null;
        }
        return {
          ...(envelope.data as Record<string, unknown>),
          subjectType: 'account',
          trial: null,
        } as AuthSession;
      },
    });
  }
}
