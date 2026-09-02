import type {ZodType} from 'zod';

import type {KeyValueStorage} from './types';

interface Envelope {
  version: number;
  data: unknown;
}

interface VersionedRepositoryOptions<T> {
  storage: KeyValueStorage;
  key: string;
  version: number;
  schema: ZodType<T>;
  migrate?: (envelope: Envelope) => T | null;
}

export class VersionedRepository<T> {
  constructor(private readonly options: VersionedRepositoryOptions<T>) {}

  async load(): Promise<T | null> {
    const raw = await this.options.storage.get(this.options.key);
    if (!raw) {
      return null;
    }

    try {
      const envelope = JSON.parse(raw) as Envelope;
      const candidate =
        envelope.version === this.options.version
          ? envelope.data
          : this.options.migrate?.(envelope);
      const parsed = this.options.schema.safeParse(candidate);
      if (parsed.success) {
        if (envelope.version !== this.options.version) {
          await this.save(parsed.data);
        }
        return parsed.data;
      }
    } catch {
      // Corrupt or obsolete local data is removed below.
    }

    await this.clear();
    return null;
  }

  async save(value: T): Promise<void> {
    const parsed = this.options.schema.parse(value);
    await this.options.storage.set(
      this.options.key,
      JSON.stringify({version: this.options.version, data: parsed}),
    );
  }

  async clear(): Promise<void> {
    await this.options.storage.remove(this.options.key);
  }
}
