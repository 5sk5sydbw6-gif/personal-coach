import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './keyValueStore';

/**
 * Persistent store used by the app. AsyncStorage is backed by the browser's
 * localStorage on web and by native storage on iOS/Android, so the same code
 * works on the laptop now and in Expo Go later.
 */
export const asyncStorageKeyValueStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
