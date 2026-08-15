import apiClient from './client';

export const analyticsApi = {
  async getRuns() {
    const response = await apiClient.get('/analytics/runs');
    return response.data;
  },

  async getKpis(params = {}) {
    const response = await apiClient.get('/analytics/kpis', { params });
    return response.data;
  },

  async getTrends(params = {}) {
    const response = await apiClient.get('/analytics/trends', { params });
    return response.data;
  },

  async getTopics(params = {}) {
    const response = await apiClient.get('/analytics/topics', { params });
    return response.data;
  },

  async compareRuns(paramsOrCurrent, maybePrevious, maybeOptions = {}) {
    let params = {};
    if (typeof paramsOrCurrent === 'object' && paramsOrCurrent !== null) {
      params = paramsOrCurrent;
    } else {
      params = {
        current_run_id: paramsOrCurrent || undefined,
        previous_run_id: maybePrevious || undefined,
        ...maybeOptions
      };
    }
    const response = await apiClient.get('/analytics/compare', { params });
    return response.data;
  },

  async getPipelineStatus() {
    const response = await apiClient.get('/analytics/status');
    return response.data;
  },

  async downloadReport(params = {}) {
    const response = await apiClient.get('/analytics/report', {
      params,
      responseType: 'blob',
    });
    
    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `voila_analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  }
};
