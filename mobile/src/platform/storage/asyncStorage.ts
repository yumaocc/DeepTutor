import AsyncStorage from '@react-native-async-storage/async-storage';

import type {KeyValueStorage} from './types';

export const appStorage: KeyValueStorage = {
  get: key => AsyncStorage.getItem(key),
  set: async (key, value) => {
    await AsyncStorage.setItem(key, value);
  },
  remove: async key => {
    await AsyncStorage.removeItem(key);
  },
};
