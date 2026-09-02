import {z} from 'zod';

import type {KeyValueStorage} from '../../platform/storage/types';
import {VersionedRepository} from '../../platform/storage/VersionedRepository';

const authSessionSchema = z.object({
  authEnabled: z.boolean(),
  accessToken: z.string().min(1).nullable(),
  refreshToken: z.string().min(1).nullable(),
  expiresAt: z.number().int().positive().nullable(),
  serverAddress: z.string().url(),
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
      version: 1,
      schema: authSessionSchema,
    });
  }
}
