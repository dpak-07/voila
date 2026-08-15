import apiClient from './client';

export const ragApi = {
  async queryRag(q) {
    const response = await apiClient.get('/rag/query', {
      params: { q },
    });
    return response.data;
  }
};
