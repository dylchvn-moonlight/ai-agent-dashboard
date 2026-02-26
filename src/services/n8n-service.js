// n8n-service.js — n8n REST API client (renderer-side, calls via IPC)
// All methods proxy through Electron's main process to avoid CORS.

const n8nService = {
  /**
   * List all workflows on the n8n instance.
   */
  async listWorkflows() {
    return window.electronAPI?.n8nRequest('GET', '/workflows');
  },

  /**
   * Get a specific workflow by ID.
   */
  async getWorkflow(id) {
    return window.electronAPI?.n8nRequest('GET', `/workflows/${id}`);
  },

  /**
   * Create a new workflow from JSON.
   */
  async createWorkflow(workflowJson) {
    return window.electronAPI?.n8nRequest('POST', '/workflows', workflowJson);
  },

  /**
   * Update an existing workflow.
   */
  async updateWorkflow(id, workflowJson) {
    return window.electronAPI?.n8nRequest('PATCH', `/workflows/${id}`, workflowJson);
  },

  /**
   * Delete a workflow.
   */
  async deleteWorkflow(id) {
    return window.electronAPI?.n8nRequest('DELETE', `/workflows/${id}`);
  },

  /**
   * Activate a workflow.
   */
  async activateWorkflow(id) {
    return window.electronAPI?.n8nRequest('POST', `/workflows/${id}/activate`);
  },

  /**
   * Deactivate a workflow.
   */
  async deactivateWorkflow(id) {
    return window.electronAPI?.n8nRequest('POST', `/workflows/${id}/deactivate`);
  },

  /**
   * Execute a workflow manually.
   */
  async runWorkflow(id) {
    return window.electronAPI?.n8nRequest('POST', `/workflows/${id}/run`);
  },

  /**
   * List all credentials on the n8n instance.
   */
  async listCredentials() {
    return window.electronAPI?.n8nRequest('GET', '/credentials');
  },

  /**
   * List executions, optionally filtered.
   */
  async listExecutions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = query ? `/executions?${query}` : '/executions';
    return window.electronAPI?.n8nRequest('GET', path);
  },

  /**
   * Test connection to n8n by listing workflows.
   */
  async testConnection() {
    return window.electronAPI?.n8nTestConnection();
  },
};

export default n8nService;
