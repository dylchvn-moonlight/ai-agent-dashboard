const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  autoUpdater = null;
}

const isDev = !app.isPackaged;

const DATA_DIR = path.join(app.getPath('userData'), 'AIAgentDashboard');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading', filePath, e.message);
  }
  return null;
}

function writeJSON(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing', filePath, e.message);
    return false;
  }
}

let mainWindow;

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B0F1A',
      symbolColor: '#94A3B8',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0B0F1A',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer-dist', 'index.html'));
  }
}

// --- IPC HANDLERS ---

// Data persistence
ipcMain.handle('data:load', async () => {
  try {
    return readJSON(DATA_FILE);
  } catch (e) {
    console.error('data:load failed:', e);
    return null;
  }
});

ipcMain.handle('data:save', async (_event, data) => {
  try {
    return writeJSON(DATA_FILE, data);
  } catch (e) {
    console.error('data:save failed:', e);
    return false;
  }
});

// Settings
ipcMain.handle('settings:load', async () => {
  try {
    return readJSON(SETTINGS_FILE);
  } catch (e) {
    console.error('settings:load failed:', e);
    return null;
  }
});

ipcMain.handle('settings:save', async (_event, settings) => {
  try {
    return writeJSON(SETTINGS_FILE, settings);
  } catch (e) {
    console.error('settings:save failed:', e);
    return false;
  }
});

// Credentials (encrypted)
ipcMain.handle('credentials:save', async (_event, key, value) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    if (safeStorage.isEncryptionAvailable()) {
      creds[key] = safeStorage.encryptString(value).toString('base64');
    } else {
      creds[key] = value; // fallback
    }
    return writeJSON(CREDENTIALS_FILE, creds);
  } catch (e) {
    console.error('credentials:save failed:', e);
    return false;
  }
});

ipcMain.handle('credentials:load', async (_event, key) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE);
    if (!creds || !creds[key]) return null;
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(creds[key], 'base64'));
    }
    return creds[key];
  } catch (e) {
    console.error('credentials:load failed:', e);
    return null;
  }
});

// --- Multi-Key Credential Management ---

function maskKeyValue(key) {
  if (!key) return '';
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '...' + key.slice(-4);
}

function encryptValue(value) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64');
  }
  return value;
}

function decryptValue(encrypted) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
    return encrypted;
  } catch {
    return encrypted;
  }
}

// Load all keys for a provider (returns masked values for display)
ipcMain.handle('credentials:load-all-keys', async (_event, provider) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const arrayKey = `${provider}-api-keys`;
    const raw = creds[arrayKey];
    if (!raw) return [];
    const decrypted = decryptValue(raw);
    const keys = JSON.parse(decrypted);
    // Get the active key to mark which is active
    const activeRaw = creds[`${provider}-api-key`];
    const activeKey = activeRaw ? decryptValue(activeRaw) : null;
    return keys.map((k) => ({
      id: k.id,
      label: k.label,
      masked: maskKeyValue(k.key),
      addedAt: k.addedAt,
      isActive: k.key === activeKey,
    }));
  } catch (e) {
    console.error('credentials:load-all-keys failed:', e);
    return [];
  }
});

// Add a new key for a provider
ipcMain.handle('credentials:add-key', async (_event, provider, label, key) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const arrayKey = `${provider}-api-keys`;
    const singularKey = `${provider}-api-key`;

    // Load existing array
    let keys = [];
    if (creds[arrayKey]) {
      const decrypted = decryptValue(creds[arrayKey]);
      keys = JSON.parse(decrypted);
    }

    const newEntry = {
      id: crypto.randomUUID(),
      label: label || `Key ${keys.length + 1}`,
      key: key.trim(),
      addedAt: new Date().toISOString(),
    };
    keys.push(newEntry);

    // Encrypt and store array
    creds[arrayKey] = encryptValue(JSON.stringify(keys));
    // Set as active key
    creds[singularKey] = encryptValue(key.trim());
    writeJSON(CREDENTIALS_FILE, creds);

    return { success: true, id: newEntry.id };
  } catch (e) {
    console.error('credentials:add-key failed:', e);
    return { success: false, error: e.message };
  }
});

// Delete a key by ID
ipcMain.handle('credentials:delete-key', async (_event, provider, keyId) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const arrayKey = `${provider}-api-keys`;
    const singularKey = `${provider}-api-key`;

    if (!creds[arrayKey]) return { success: false, error: 'No keys found' };

    const decrypted = decryptValue(creds[arrayKey]);
    let keys = JSON.parse(decrypted);

    const activeRaw = creds[singularKey];
    const activeKeyVal = activeRaw ? decryptValue(activeRaw) : null;
    const deletedKey = keys.find((k) => k.id === keyId);
    keys = keys.filter((k) => k.id !== keyId);

    creds[arrayKey] = encryptValue(JSON.stringify(keys));

    // If the deleted key was active, switch to next available or clear
    if (deletedKey && deletedKey.key === activeKeyVal) {
      if (keys.length > 0) {
        creds[singularKey] = encryptValue(keys[0].key);
      } else {
        delete creds[singularKey];
      }
    }

    writeJSON(CREDENTIALS_FILE, creds);
    return { success: true };
  } catch (e) {
    console.error('credentials:delete-key failed:', e);
    return { success: false, error: e.message };
  }
});

// Set a specific key as the active key
ipcMain.handle('credentials:set-active-key', async (_event, provider, keyId) => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const arrayKey = `${provider}-api-keys`;
    const singularKey = `${provider}-api-key`;

    if (!creds[arrayKey]) return { success: false, error: 'No keys found' };

    const decrypted = decryptValue(creds[arrayKey]);
    const keys = JSON.parse(decrypted);
    const target = keys.find((k) => k.id === keyId);
    if (!target) return { success: false, error: 'Key not found' };

    creds[singularKey] = encryptValue(target.key);
    writeJSON(CREDENTIALS_FILE, creds);
    return { success: true };
  } catch (e) {
    console.error('credentials:set-active-key failed:', e);
    return { success: false, error: e.message };
  }
});

// --- Dynamic Model Fetching ---

ipcMain.handle('models:fetch', async (_event, provider) => {
  try {
    const credentials = loadAllCredentials();

    switch (provider) {
      case 'claude':
        return {
          success: true,
          models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6'],
        };

      case 'minimax':
        return {
          success: true,
          models: ['MiniMax-M2.5', 'MiniMax-M1'],
        };

      case 'openai': {
        const apiKey = credentials['openai-api-key'];
        if (!apiKey) return { success: false, error: 'No OpenAI API key configured' };
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          return { success: false, error: `OpenAI API error: ${res.status}` };
        }
        const data = await res.json();
        const chatModels = (data.data || [])
          .filter((m) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('chatgpt'))
          .map((m) => m.id)
          .sort();
        return { success: true, models: chatModels };
      }

      case 'kimi': {
        const apiKey = credentials['kimi-api-key'];
        if (!apiKey) return { success: false, error: 'No Kimi API key configured' };
        const res = await fetch('https://api.moonshot.ai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          return { success: false, error: `Kimi API error: ${res.status}` };
        }
        const data = await res.json();
        const models = (data.data || []).map((m) => m.id).sort();
        return { success: true, models };
      }

      case 'local':
        return { success: true, models: [] };

      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (e) {
    console.error('models:fetch failed:', e);
    return { success: false, error: e.message };
  }
});

// App version
ipcMain.handle('app:get-version', () => app.getVersion());

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());

// Agent execution engine
const AgentEngine = require('./agent-engine');
const agentEngine = new AgentEngine();

// Artifact manager
const ArtifactManager = require('./artifact-manager');
const artifactManager = new ArtifactManager();

/**
 * Helper: load all decrypted credentials into a plain object
 * so the engine can use them without re-decrypting per node.
 */
function loadAllCredentials() {
  const creds = readJSON(CREDENTIALS_FILE) || {};
  const result = {};
  for (const [key, encrypted] of Object.entries(creds)) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        result[key] = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      } else {
        result[key] = encrypted;
      }
    } catch {
      result[key] = encrypted;
    }
  }
  return result;
}

ipcMain.handle('agent:execute', async (_event, { agent, input, executionId }) => {
  try {
    // Gather credentials and settings from disk
    const credentials = loadAllCredentials();
    const settings = readJSON(SETTINGS_FILE) || {};

    const result = await agentEngine.execute(agent, input, credentials, settings, executionId);
    return result;
  } catch (e) {
    console.error('agent:execute failed:', e);
    return { success: false, error: e.message || String(e) };
  }
});

ipcMain.handle('agent:stop', async (_event, executionId) => {
  try {
    return agentEngine.stop(executionId);
  } catch (e) {
    console.error('agent:stop failed:', e);
    return false;
  }
});

// --- Artifact IPC Handlers ---

ipcMain.handle('artifact:save', async (_event, params) => {
  try {
    return artifactManager.save(params);
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('artifact:list', async (_event, filters) => {
  try {
    return artifactManager.list(filters);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('artifact:open', async (_event, artifactId) => {
  try {
    return await artifactManager.open(artifactId);
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('artifact:delete', async (_event, artifactId) => {
  try {
    return artifactManager.delete(artifactId);
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('artifact:get-dir', async () => {
  return artifactManager.getArtifactsDir();
});

ipcMain.handle('artifact:open-folder', async () => {
  try {
    return await artifactManager.openFolder();
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- Email IPC Handlers (Nodemailer) ---

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

async function buildSmtpTransporter() {
  if (!nodemailer) throw new Error('nodemailer is not installed.');
  const credentials = loadAllCredentials();
  const host = credentials['smtp-host'];
  const port = parseInt(credentials['smtp-port']) || 587;
  const secure = credentials['smtp-secure'] === 'true';
  const user = credentials['smtp-user'];
  const pass = credentials['smtp-pass'];

  if (!host || !user) {
    throw new Error('SMTP not configured. Go to Settings > Email to set up SMTP.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

ipcMain.handle('email:send', async (_event, message) => {
  try {
    const credentials = loadAllCredentials();
    const transporter = await buildSmtpTransporter();
    const fromName = credentials['smtp-from-name'] || 'AI Agent';
    const fromEmail = credentials['smtp-from-email'] || credentials['smtp-user'];

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: message.to,
      cc: message.cc || undefined,
      bcc: message.bcc || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text || undefined,
      attachments: message.attachments || undefined,
    });

    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('email:test', async () => {
  try {
    const transporter = await buildSmtpTransporter();
    await transporter.verify();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- MiniMax OAuth IPC Handlers ---

/**
 * Start OAuth flow: opens a modal BrowserWindow to the auth URL,
 * captures the redirect code, exchanges it for tokens, and stores encrypted.
 */
ipcMain.handle('minimax-oauth:start', async (_event, params) => {
  const {
    authUrl,
    tokenUrl,
    clientId,
    clientSecret,
    redirectUri = 'http://localhost:19816/callback',
    scope = 'openid',
  } = params || {};

  if (!authUrl || !clientId) {
    return { success: false, error: 'OAuth auth URL and client ID are required.' };
  }

  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      parent: mainWindow,
      modal: true,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const fullAuthUrl =
      `${authUrl}?response_type=code&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    authWindow.loadURL(fullAuthUrl);

    // Intercept the redirect to capture the auth code
    authWindow.webContents.on('will-redirect', async (_e, url) => {
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const error = parsed.searchParams.get('error');

        if (error) {
          authWindow.close();
          resolve({ success: false, error: `OAuth error: ${error}` });
          return;
        }

        if (code) {
          authWindow.close();

          // Exchange code for tokens
          const exchangeUrl = tokenUrl || authUrl.replace('/authorize', '/token');
          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
          });
          if (clientSecret) {
            body.append('client_secret', clientSecret);
          }

          const tokenResponse = await fetch(exchangeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            resolve({ success: false, error: `Token exchange failed: ${errText}` });
            return;
          }

          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;
          const refreshToken = tokenData.refresh_token || null;
          const expiresIn = tokenData.expires_in || 3600;
          const expiresAt = Date.now() + expiresIn * 1000;

          // Store access token (used by llm-router)
          const creds = readJSON(CREDENTIALS_FILE) || {};
          if (safeStorage.isEncryptionAvailable()) {
            creds['minimax-oauth-token'] = safeStorage
              .encryptString(accessToken)
              .toString('base64');
            // Store full token bundle (refresh_token + metadata)
            creds['minimax-oauth-blob'] = safeStorage
              .encryptString(
                JSON.stringify({ refreshToken, expiresAt, tokenUrl: exchangeUrl, clientId, clientSecret })
              )
              .toString('base64');
          } else {
            creds['minimax-oauth-token'] = accessToken;
            creds['minimax-oauth-blob'] = JSON.stringify({ refreshToken, expiresAt, tokenUrl: exchangeUrl, clientId, clientSecret });
          }
          writeJSON(CREDENTIALS_FILE, creds);

          resolve({ success: true, expiresAt });
        }
      } catch (err) {
        authWindow.close();
        resolve({ success: false, error: err.message });
      }
    });

    // Also handle navigation (some OAuth providers navigate instead of redirect)
    authWindow.webContents.on('will-navigate', async (_e, url) => {
      if (url.startsWith(redirectUri)) {
        // Same handling as will-redirect
        _e.preventDefault();
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          if (code) {
            // Trigger will-redirect handler logic would be duplicated,
            // so just re-navigate which will trigger will-redirect
            authWindow.loadURL(url);
          }
        } catch { /* ignore */ }
      }
    });

    authWindow.on('closed', () => {
      resolve({ success: false, error: 'OAuth window was closed.' });
    });
  });
});

/**
 * Refresh OAuth token using stored refresh_token.
 */
ipcMain.handle('minimax-oauth:refresh', async () => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const blobRaw = creds['minimax-oauth-blob'];
    if (!blobRaw) return { success: false, error: 'No OAuth session found.' };

    let blob;
    try {
      if (safeStorage.isEncryptionAvailable()) {
        blob = JSON.parse(safeStorage.decryptString(Buffer.from(blobRaw, 'base64')));
      } else {
        blob = JSON.parse(blobRaw);
      }
    } catch {
      return { success: false, error: 'Failed to decrypt OAuth data.' };
    }

    if (!blob.refreshToken) {
      return { success: false, error: 'No refresh token available. Re-authenticate.' };
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: blob.refreshToken,
      client_id: blob.clientId,
    });
    if (blob.clientSecret) {
      body.append('client_secret', blob.clientSecret);
    }

    const response = await fetch(blob.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Refresh failed: ${errText}` };
    }

    const tokenData = await response.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || blob.refreshToken;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Update stored tokens
    if (safeStorage.isEncryptionAvailable()) {
      creds['minimax-oauth-token'] = safeStorage
        .encryptString(newAccessToken)
        .toString('base64');
      creds['minimax-oauth-blob'] = safeStorage
        .encryptString(
          JSON.stringify({ ...blob, refreshToken: newRefreshToken, expiresAt })
        )
        .toString('base64');
    } else {
      creds['minimax-oauth-token'] = newAccessToken;
      creds['minimax-oauth-blob'] = JSON.stringify({ ...blob, refreshToken: newRefreshToken, expiresAt });
    }
    writeJSON(CREDENTIALS_FILE, creds);

    return { success: true, expiresAt };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * Check OAuth connection status.
 */
ipcMain.handle('minimax-oauth:status', async () => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    const hasToken = !!creds['minimax-oauth-token'];
    if (!hasToken) {
      return { connected: false, expired: false, expiresAt: null, hasRefreshToken: false };
    }

    const blobRaw = creds['minimax-oauth-blob'];
    let expiresAt = null;
    let hasRefreshToken = false;

    if (blobRaw) {
      try {
        let blob;
        if (safeStorage.isEncryptionAvailable()) {
          blob = JSON.parse(safeStorage.decryptString(Buffer.from(blobRaw, 'base64')));
        } else {
          blob = JSON.parse(blobRaw);
        }
        expiresAt = blob.expiresAt || null;
        hasRefreshToken = !!blob.refreshToken;
      } catch { /* ignore */ }
    }

    const expired = expiresAt ? Date.now() > expiresAt : false;

    return { connected: true, expired, expiresAt, hasRefreshToken };
  } catch {
    return { connected: false, expired: false, expiresAt: null, hasRefreshToken: false };
  }
});

/**
 * Disconnect OAuth — remove stored tokens.
 */
ipcMain.handle('minimax-oauth:disconnect', async () => {
  try {
    const creds = readJSON(CREDENTIALS_FILE) || {};
    delete creds['minimax-oauth-token'];
    delete creds['minimax-oauth-blob'];
    writeJSON(CREDENTIALS_FILE, creds);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- Business Assistant Chat (direct LLM call, bypasses agent engine) ---

const LLMRouter = require('./llm-router');
const assistantRouter = new LLMRouter();

ipcMain.handle('assistant:chat', async (_event, { message, history, knowledgeContext }) => {
  try {
    const credentials = loadAllCredentials();
    const settings = readJSON(SETTINGS_FILE) || {};

    // Use default provider/model from settings, fall back to first configured provider
    let provider = settings.defaultProvider || 'claude';
    let model = settings.defaultModel || 'claude-sonnet-4-6';

    // Build system prompt
    let systemPrompt =
      'You are a helpful business AI assistant. Provide clear, actionable answers. ' +
      'When relevant, reference information from the knowledge base provided.';

    if (knowledgeContext) {
      systemPrompt += '\n\n' + knowledgeContext;
    }

    // Build the input string with conversation history
    let fullInput = '';
    if (history && history.length > 0) {
      // Include last 20 messages for context
      const recentHistory = history.slice(-20);
      recentHistory.forEach((msg) => {
        fullInput += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n\n`;
      });
    }
    fullInput += `User: ${message}`;

    const result = await assistantRouter.call(provider, {
      model,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    }, fullInput, credentials);

    return { text: result.text, tokens: result.tokens, latency: result.latency };
  } catch (e) {
    console.error('assistant:chat failed:', e);
    return { error: e.message || 'Failed to get response from LLM.' };
  }
});

// --- In-App Update System ---

ipcMain.handle('updates:check', async () => {
  if (!autoUpdater) return { success: false, error: 'electron-updater not available' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('updates:download', async () => {
  if (!autoUpdater) return { success: false, error: 'electron-updater not available' };
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('updates:install', async () => {
  if (!autoUpdater) return { success: false, error: 'electron-updater not available' };
  autoUpdater.quitAndInstall();
});

function setupAutoUpdater() {
  if (!autoUpdater) return;

  autoUpdater.autoDownload = false;

  // Forward events to renderer
  const events = ['update-available', 'update-not-available', 'download-progress', 'update-downloaded', 'error'];
  events.forEach((eventName) => {
    autoUpdater.on(eventName, (data) => {
      mainWindow?.webContents?.send(`update:${eventName}`, data);
    });
  });

  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

// --- APP LIFECYCLE ---

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  mainWindow = null;
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
