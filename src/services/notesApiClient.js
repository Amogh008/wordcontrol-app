import axios from 'axios';
import { getToken } from './tokenStore';
import { API_BASE_URL } from './apiClient';
import { applyLanguageProfileHeader } from './languageProfileStore';

export const notesApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/notes`,
});

notesApiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return applyLanguageProfileHeader(config);
});
