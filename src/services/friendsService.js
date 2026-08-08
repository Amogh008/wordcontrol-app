import { friendsApiClient } from './friendsApiClient';

export async function getFriends() {
  const { data } = await friendsApiClient.get('/');
  return data;
}

export async function getPendingRequests() {
  const { data } = await friendsApiClient.get('/requests');
  return data;
}

export async function sendFriendRequestByUserId(userId) {
  const { data } = await friendsApiClient.post('/requests', { userId });
  return data;
}

export async function acceptFriendRequest(friendId) {
  const { data } = await friendsApiClient.post(`/${friendId}/accept`);
  return data;
}

// Also used to reject an incoming request or cancel one you sent -
// the backend models both as removing the (still pending) friend entry.
export async function removeFriend(friendId) {
  await friendsApiClient.delete(`/${friendId}`);
}
