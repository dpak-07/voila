import apiClient from './client';

export const agentApi = {
  async queryAgent(payload) {
    const response = await apiClient.post('/agent/query', payload);
    return response.data;
  },

  async chat(payload) {
    const response = await apiClient.post('/agent/chat', payload);
    return response.data;
  },

  async getConversations(limit = 50) {
    const response = await apiClient.get('/agent/conversations', {
      params: { limit },
    });
    return response.data;
  },

  async previewDecision(payload) {
    const response = await apiClient.post('/agent/preview', payload);
    return response.data;
  },

  async deleteConversation(convId) {
    const response = await apiClient.delete(`/agent/conversations/${convId}`);
    return response.data;
  },

  async clearConversations() {
    const response = await apiClient.delete('/agent/conversations');
    return response.data;
  }
};
