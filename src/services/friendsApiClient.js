import axios from 'axios';
import { getToken } from './tokenStore';
import { API_BASE_URL } from './apiClient';
import { applyLanguageProfileHeader } from './languageProfileStore';

export const friendsApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/friends`,
});

friendsApiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return applyLanguageProfileHeader(config);
});
