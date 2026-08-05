import axios from 'axios';
import { getToken } from './tokenStore';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required. Set it in the active Expo environment file.');
}

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/word`,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
