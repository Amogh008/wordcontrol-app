import axios from 'axios';
import { getToken } from './tokenStore';
import { API_BASE_URL } from './apiClient';

export const callHistoryApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/calls`,
});

callHistoryApiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
