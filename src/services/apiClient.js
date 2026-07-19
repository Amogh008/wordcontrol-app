import axios from 'axios';
import { getToken } from './tokenStore';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wordcontrol.onrender.com';

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
