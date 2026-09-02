import {describe, expect, it} from '@jest/globals';
import {z} from 'zod';

import type {KeyValueStorage} from '../src/platform/storage/types';
import {VersionedRepository} from '../src/platform/storage/VersionedRepository';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.values.set(key, value);
  }
  async remove(key: string) {
    this.values.delete(key);
  }
}

describe('VersionedRepository', () => {
  it('validates saved values and reloads the envelope', async () => {
    const storage = new MemoryStorage();
    const repository = new VersionedRepository({
      storage,
      key: 'settings',
      version: 1,
      schema: z.object({theme: z.enum(['system', 'dark'])}),
    });
    await repository.save({theme: 'dark'});
    await expect(repository.load()).resolves.toEqual({theme: 'dark'});
  });

  it('removes corrupt data instead of leaking it into application state', async () => {
    const storage = new MemoryStorage();
    storage.values.set('settings', '{broken');
    const repository = new VersionedRepository({
      storage,
      key: 'settings',
      version: 1,
      schema: z.object({theme: z.string()}),
    });
    await expect(repository.load()).resolves.toBeNull();
    expect(storage.values.has('settings')).toBe(false);
  });
});
