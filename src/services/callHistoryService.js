import { callHistoryApiClient } from './callHistoryApiClient';

export async function getCallHistory({ page = 1, limit = 20 } = {}) {
  const { data } = await callHistoryApiClient.get('/', { params: { page, limit } });
  return data;
}

export async function rateCall(sessionId, score) {
  const { data } = await callHistoryApiClient.post(`/session/${sessionId}/rating`, { score });
  return data;
}
