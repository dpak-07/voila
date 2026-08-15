import apiClient from './client';

export const authApi = {
  async login(username, password) {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};
