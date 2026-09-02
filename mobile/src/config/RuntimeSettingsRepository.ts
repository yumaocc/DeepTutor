import {z} from 'zod';

import {normalizeServerAddress} from './runtime';
import type {KeyValueStorage} from '../platform/storage/types';
import {VersionedRepository} from '../platform/storage/VersionedRepository';

const runtimeSettingsSchema = z.object({
  serverAddress: z.string().transform(normalizeServerAddress),
  locale: z.enum(['system', 'zh-CN', 'en-US']).default('system'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
});

export type RuntimeSettings = z.infer<typeof runtimeSettingsSchema>;

export class RuntimeSettingsRepository extends VersionedRepository<RuntimeSettings> {
  constructor(storage: KeyValueStorage) {
    super({
      storage,
      key: 'deeptutor.mobile.runtime-settings',
      version: 1,
      schema: runtimeSettingsSchema,
    });
  }
}
