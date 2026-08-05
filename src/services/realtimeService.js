import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';

export function createRealtimeConnection() {
  return io(API_BASE_URL, {
    auth: { token: getToken() },
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
}
