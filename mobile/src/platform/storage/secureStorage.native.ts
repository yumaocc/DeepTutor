import * as SensitiveInfo from 'react-native-sensitive-info';

import type {KeyValueStorage} from './types';

type SensitiveInfoApi = typeof SensitiveInfo;

// Version 6 publishes a default export at runtime, while its type declarations
// still describe named exports. Support both shapes so Metro and Jest resolve
// the same native API.
const sensitiveInfo =
  (SensitiveInfo as SensitiveInfoApi & {default?: SensitiveInfoApi}).default ??
  SensitiveInfo;

const options = {
  sharedPreferencesName: 'deeptutor.mobile.secure',
  keychainService: 'io.deeptutor.mobile.secure',
  kSecAttrAccessible: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly' as const,
};

export const secureStorage: KeyValueStorage = {
  get: async key => (await sensitiveInfo.getItem(key, options)) || null,
  set: async (key, value) => {
    await sensitiveInfo.setItem(key, value, options);
  },
  remove: async key => {
    await sensitiveInfo.deleteItem(key, options);
  },
};
