import { friendsApiClient } from './friendsApiClient';

export async function getFriends() {
  const { data } = await friendsApiClient.get('/');
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

export async function removeFriend(friendId) {
  await friendsApiClient.delete(`/${friendId}`);
}
