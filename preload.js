const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Data persistence
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Credentials (encrypted)
  saveCredential: (key, value) => ipcRenderer.invoke('credentials:save', key, value),
  loadCredential: (key) => ipcRenderer.invoke('credentials:load', key),

  // App version
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Multi-key credential management
  loadAllKeys: (provider) => ipcRenderer.invoke('credentials:load-all-keys', provider),
  addKey: (provider, label, key) => ipcRenderer.invoke('credentials:add-key', provider, label, key),
  deleteKey: (provider, keyId) => ipcRenderer.invoke('credentials:delete-key', provider, keyId),
  setActiveKey: (provider, keyId) => ipcRenderer.invoke('credentials:set-active-key', provider, keyId),

  // Dynamic model fetching
  fetchModels: (provider) => ipcRenderer.invoke('models:fetch', provider),

  // In-app updates
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateEvent: (callback) => {
    const events = ['update-available', 'update-not-available', 'download-progress', 'update-downloaded', 'error'];
    const handlers = events.map((eventName) => {
      const handler = (_event, data) => callback(eventName, data);
      ipcRenderer.on(`update:${eventName}`, handler);
      return { eventName: `update:${eventName}`, handler };
    });
    return () => {
      handlers.forEach(({ eventName, handler }) => {
        ipcRenderer.removeListener(eventName, handler);
      });
    };
  },

  // MiniMax OAuth
  startMiniMaxOAuth: (params) => ipcRenderer.invoke('minimax-oauth:start', params),
  refreshMiniMaxOAuth: () => ipcRenderer.invoke('minimax-oauth:refresh'),
  getMiniMaxOAuthStatus: () => ipcRenderer.invoke('minimax-oauth:status'),
  disconnectMiniMaxOAuth: () => ipcRenderer.invoke('minimax-oauth:disconnect'),

  // Business assistant (direct LLM chat)
  assistantChat: (params) => ipcRenderer.invoke('assistant:chat', params),

  // Agent execution
  executeAgent: (agent, input, executionId) =>
    ipcRenderer.invoke('agent:execute', { agent, input, executionId }),
  stopAgent: (executionId) =>
    ipcRenderer.invoke('agent:stop', executionId),

  // Artifacts
  saveArtifact: (params) => ipcRenderer.invoke('artifact:save', params),
  listArtifacts: (filters) => ipcRenderer.invoke('artifact:list', filters),
  openArtifact: (artifactId) => ipcRenderer.invoke('artifact:open', artifactId),
  deleteArtifact: (artifactId) => ipcRenderer.invoke('artifact:delete', artifactId),
  getArtifactDir: () => ipcRenderer.invoke('artifact:get-dir'),
  openArtifactFolder: () => ipcRenderer.invoke('artifact:open-folder'),
  onArtifactCreated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('artifact:created', handler);
    return () => ipcRenderer.removeListener('artifact:created', handler);
  },

  // Terminal
  terminalSpawn: (params) => ipcRenderer.invoke('terminal:spawn', params),
  terminalWrite: (params) => ipcRenderer.invoke('terminal:write', params),
  terminalResize: (params) => ipcRenderer.invoke('terminal:resize', params),
  terminalKill: (params) => ipcRenderer.invoke('terminal:kill', params),
  terminalGetCwd: () => ipcRenderer.invoke('terminal:get-cwd'),
  onTerminalData: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('terminal:data', handler);
    return () => ipcRenderer.removeListener('terminal:data', handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('terminal:exit', handler);
    return () => ipcRenderer.removeListener('terminal:exit', handler);
  },

  // Widget export
  saveWidget: (params) => ipcRenderer.invoke('widget:save', params),

  // Email
  sendEmail: (message) => ipcRenderer.invoke('email:send', message),
  testEmailConnection: () => ipcRenderer.invoke('email:test'),

  // n8n API proxy
  n8nRequest: (method, path, body) => ipcRenderer.invoke('n8n:request', method, path, body),
  n8nTestConnection: () => ipcRenderer.invoke('n8n:test-connection'),

  // Push events (main → renderer)
  onExecutionStep: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('execution:step', handler);
    return () => ipcRenderer.removeListener('execution:step', handler);
  },
  onExecutionComplete: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('execution:complete', handler);
    return () => ipcRenderer.removeListener('execution:complete', handler);
  },
  onExecutionError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('execution:error', handler);
    return () => ipcRenderer.removeListener('execution:error', handler);
  },
});
