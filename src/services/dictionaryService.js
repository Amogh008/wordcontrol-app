import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';
import axios from 'axios';

const dictionaryClient = axios.create({
  baseURL: `${API_BASE_URL}/api/dictionary`,
});

dictionaryClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function searchDictionary(query) {
  const { data } = await dictionaryClient.get('/search', { params: { q: query } });
  return data.words;
}

export async function getDictionaryEntry(word) {
  const { data } = await dictionaryClient.get('/entry', { params: { word } });
  return data;
}
