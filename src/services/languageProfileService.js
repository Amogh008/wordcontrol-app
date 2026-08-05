import axios from 'axios';
import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';

const client = axios.create({ baseURL: `${API_BASE_URL}/api/language-profiles` });
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getLanguageProfiles() {
  const { data } = await client.get('/');
  return data;
}

export async function createLanguageProfile(language) {
  const { data } = await client.post('/', { language });
  return data;
}

export async function deleteLanguageProfile(id) {
  await client.delete(`/${id}`);
}
