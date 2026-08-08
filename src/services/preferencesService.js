import axios from 'axios';
import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';

const client = axios.create({ baseURL: `${API_BASE_URL}/api/preferences` });
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getPreferences() {
  const { data } = await client.get('/');
  return data;
}

export async function updatePreferences(update) {
  const { data } = await client.patch('/', update);
  return data;
}
