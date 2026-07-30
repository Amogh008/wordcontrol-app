import { apiClient, API_BASE_URL } from './apiClient';
import { getToken } from './tokenStore';

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

export async function generateStory({ wordIds } = {}) {
  const { data } = await apiClient.post('/story', { wordIds });
  return data;
}

export function streamStory({ wordIds, onDelta }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let processedLength = 0;
    let pending = '';
    let completedStory = null;

    const consumeLines = (isFinal = false) => {
      const nextText = request.responseText.slice(processedLength);
      processedLength = request.responseText.length;
      pending += nextText;
      const lines = pending.split('\n');
      pending = isFinal ? '' : lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'delta') onDelta(event.text);
        if (event.type === 'done') completedStory = event.story;
        if (event.type === 'error') throw new Error(event.error);
      }
    };

    request.open('POST', `${API_BASE_URL}/api/word/story/stream`);
    request.setRequestHeader('Content-Type', 'application/json');
    const token = getToken();
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);

    request.onprogress = () => {
      try {
        consumeLines();
      } catch (err) {
        request.abort();
        reject(err);
      }
    };
    request.onerror = () => reject(new Error('Die Verbindung zum Server wurde unterbrochen.'));
    request.onload = () => {
      try {
        if (request.status < 200 || request.status >= 300) {
          const payload = JSON.parse(request.responseText || '{}');
          throw new Error(payload.error || `Story request failed (${request.status}).`);
        }
        consumeLines(true);
        if (!completedStory) throw new Error('Die Geschichte wurde nicht vollständig übertragen.');
        resolve(completedStory);
      } catch (err) {
        reject(err);
      }
    };
    request.send(JSON.stringify({ wordIds }));
  });
}
