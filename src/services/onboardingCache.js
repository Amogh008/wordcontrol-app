import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'wordcontrol_onboarded_';

// Same native/web split as tokenStore.js - expo-secure-store has no web implementation.
const webStore = {
  async getItem(key) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};

const store = Platform.OS === 'web'
  ? webStore
  : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync };

// Scoped per userId so one account's completed onboarding never leaks onto
// a different account signing in on the same device.
export async function wasOnboardedOnThisDevice(userId) {
  try {
    return (await store.getItem(KEY_PREFIX + userId)) === '1';
  } catch (err) {
    return false;
  }
}

export async function rememberOnboarded(userId) {
  try {
    await store.setItem(KEY_PREFIX + userId, '1');
  } catch (err) {
    // Best-effort cache only - a write failure just means we ask the server again next time.
  }
}
