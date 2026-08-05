import { API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';
import axios from 'axios';
import { applyLanguageProfileHeader } from './languageProfileStore';

const dictionaryClient = axios.create({
  baseURL: `${API_BASE_URL}/api/dictionary`,
});

dictionaryClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return applyLanguageProfileHeader(config);
});

export async function getDictionaryEntry(word, interfaceLanguage = 'en') {
  const { data } = await dictionaryClient.get('/entry', { params: { word, interfaceLanguage } });
  return data;
}
