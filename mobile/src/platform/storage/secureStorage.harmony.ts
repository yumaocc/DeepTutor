import type {KeyValueStorage} from './types';

export class HarmonySecureStorageUnavailableError extends Error {
  constructor() {
    super('Harmony HUKS secure storage is not linked');
    this.name = 'HarmonySecureStorageUnavailableError';
  }
}

/**
 * Fail closed until the audited HUKS TurboModule is compiled and device-tested.
 * Never fall back to AsyncStorage or a hard-coded application encryption key.
 */
export const secureStorage: KeyValueStorage = {
  get: async () => null,
  set: async () => {
    throw new HarmonySecureStorageUnavailableError();
  },
  remove: async () => undefined,
};
