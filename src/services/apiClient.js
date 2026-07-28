import axios from 'axios';
import { getToken } from './tokenStore';

const LOCAL_API_URL = 'http://localhost:4001';
const HOSTED_API_URL = 'https://wordcontrol.onrender.com';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_APP_ENV === 'development'
    ? LOCAL_API_URL
    : process.env.EXPO_PUBLIC_API_URL || HOSTED_API_URL;

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
