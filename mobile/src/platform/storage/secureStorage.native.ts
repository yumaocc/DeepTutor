import * as SensitiveInfo from 'react-native-sensitive-info';

import type {KeyValueStorage} from './types';

const options = {
  sharedPreferencesName: 'deeptutor.mobile.secure',
  keychainService: 'io.deeptutor.mobile.secure',
  kSecAttrAccessible: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly' as const,
};

export const secureStorage: KeyValueStorage = {
  get: async key => (await SensitiveInfo.getItem(key, options)) || null,
  set: async (key, value) => {
    await SensitiveInfo.setItem(key, value, options);
  },
  remove: async key => {
    await SensitiveInfo.deleteItem(key, options);
  },
};
