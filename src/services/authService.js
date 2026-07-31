import axios from 'axios';
import { API_BASE_URL } from './apiClient';
import { getToken, loadToken, setToken } from './tokenStore';

const authClient = axios.create({ baseURL: `${API_BASE_URL}/api/auth` });

authClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { loadToken };

export async function register({ email, password, name }) {
  const { data } = await authClient.post('/register', { email, password, name });
  return data;
}

export async function verifyEmail({ email, code }) {
  const { data } = await authClient.post('/verify-email', { email, code });
  await setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const { data } = await authClient.post('/login', { email, password });
  await setToken(data.token);
  return data.user;
}

export async function forgotPassword(email) {
  const { data } = await authClient.post('/forgot-password', { email });
  return data;
}

export async function resetPassword({ email, code, password }) {
  const { data } = await authClient.post('/reset-password', { email, code, password });
  return data;
}

export async function loginWithGoogle(idToken) {
  const { data } = await authClient.post('/google', { idToken });
  await setToken(data.token);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await authClient.get('/me');
  return data.user;
}

export async function logout() {
  await setToken(null);
}

export async function deleteAccount() {
  await authClient.delete('/me');
  await setToken(null);
}

export async function linkGoogle(idToken) {
  const { data } = await authClient.post('/link-google', { idToken });
  return data.user;
}
