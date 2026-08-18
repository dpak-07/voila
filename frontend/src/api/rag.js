import apiClient from './client';

export const ragApi = {
  async queryRag(q, company = null) {
    const params = { q };
    if (company) params.company = company;
    const response = await apiClient.get('/rag/query', { params });
    return response.data;
  }
};
