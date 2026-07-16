import axios from 'axios';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wordcontrol.onrender.com';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/word`,
});
