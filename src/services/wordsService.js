import { apiClient } from './apiClient';

export async function getWords() {
  const { data } = await apiClient.get('/');
  return data;
}

export async function addWord(word) {
  const { data } = await apiClient.post('/', word);
  return data;
}

export async function updateWord(id, word) {
  const { data } = await apiClient.put(`/${id}`, word);
  return data;
}

export async function deleteWord(id) {
  await apiClient.delete(`/${id}`);
}

export async function autofillWord({ wort, artikel = '' }) {
  const { data } = await apiClient.post('/autofill', { wort, artikel });
  return data;
}

export async function translateText({ text, from, to }) {
  const { data } = await apiClient.post('/translate', { text, from, to });
  return data;
}

export async function checkGrammar({ sentence }) {
  const { data } = await apiClient.post('/grammar', { sentence });
  return data;
}
