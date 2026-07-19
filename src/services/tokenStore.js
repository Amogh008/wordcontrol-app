import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wordcontrol_auth_token';

// expo-secure-store has no web implementation - it throws if called there.
// localStorage is fine for local/web dev; native platforms use SecureStore.
const webStore = {
  async getItem(key) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async deleteItem(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

const store = Platform.OS === 'web'
  ? webStore
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      deleteItem: SecureStore.deleteItemAsync,
    };

let cachedToken;

export async function loadToken() {
  if (cachedToken === undefined) {
    try {
      cachedToken = (await store.getItem(TOKEN_KEY)) || null;
    } catch (err) {
      cachedToken = null;
    }
  }
  return cachedToken;
}

// Synchronous read for the axios interceptor - loadToken() must have been
// awaited once (e.g. on app start) before this is useful.
export function getToken() {
  return cachedToken ?? null;
}

export async function setToken(token) {
  cachedToken = token || null;
  if (token) {
    await store.setItem(TOKEN_KEY, token);
  } else {
    await store.deleteItem(TOKEN_KEY);
  }
}
