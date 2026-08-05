import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';
import { getActiveLanguageProfileId } from './languageProfileStore';

export function createRealtimeConnection() {
  return io(API_BASE_URL, {
    auth: { token: getToken(), languageProfileId: getActiveLanguageProfileId() },
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
}
