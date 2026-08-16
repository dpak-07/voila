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

  async getProxyMethodology() {
    const response = await apiClient.get('/analytics/proxy-methodology');
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

  async previewReport(params = {}) {
    const response = await apiClient.get('/analytics/report-preview', { params });
    return response.data;
  },

  async downloadReport(params = {}) {
    const format = (params.format || 'pdf').toLowerCase();
    const response = await apiClient.get('/analytics/report', {
      params,
      responseType: format === 'json' ? 'json' : 'blob',
    });
    
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `voila_report_${params.report_type || 'operational'}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return true;
    }

    const mimeTypes = {
      pdf: 'application/pdf',
      markdown: 'text/markdown',
      md: 'text/markdown',
      csv: 'text/csv'
    };
    const extensions = {
      pdf: 'pdf',
      markdown: 'md',
      md: 'md',
      csv: 'csv'
    };

    const mimeType = mimeTypes[format] || 'application/pdf';
    const ext = extensions[format] || 'pdf';

    const blob = new Blob([response.data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `voila_report_${params.report_type || 'analytics'}_${new Date().toISOString().slice(0, 10)}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  async getStreamStatus(runId = 'latest') {
    const response = await apiClient.get('/analytics/stream-status', { params: { run_id: runId } });
    return response.data;
  },

  async triggerBenchmarkStream(chunkSize = 20000) {
    const response = await apiClient.post('/analytics/trigger-benchmark-stream', null, {
      params: { chunk_size: chunkSize }
    });
    return response.data;
  }
};
