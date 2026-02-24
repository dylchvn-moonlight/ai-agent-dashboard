// artifact-manager.js — Artifact storage manager (CommonJS, Electron main process)
// Handles saving, listing, opening, and deleting agent-produced files.

const { app, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(app.getPath('userData'), 'AIAgentDashboard');
const ARTIFACTS_DIR = path.join(DATA_DIR, 'artifacts');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function writeData(data) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function resolveFilename(template) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, '-');
  return template
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{time\}\}/g, time)
    .replace(/\{\{timestamp\}\}/g, Date.now().toString());
}

class ArtifactManager {
  getArtifactsDir() {
    return ARTIFACTS_DIR;
  }

  getDataDir() {
    return DATA_DIR;
  }

  /**
   * Save a file artifact to disk and register its metadata.
   */
  save({ agentId, executionId, nodeId, nodeType, filename, buffer, mimeType, metadata = {} }) {
    const dir = path.join(ARTIFACTS_DIR, agentId, executionId);
    ensureDir(dir);

    const resolvedFilename = resolveFilename(filename);
    const filePath = path.join(dir, resolvedFilename);
    const relativePath = path.relative(DATA_DIR, filePath);

    // Write file
    if (Buffer.isBuffer(buffer)) {
      fs.writeFileSync(filePath, buffer);
    } else if (typeof buffer === 'string') {
      fs.writeFileSync(filePath, buffer, 'utf-8');
    } else {
      fs.writeFileSync(filePath, Buffer.from(buffer));
    }

    const stats = fs.statSync(filePath);

    // Determine type from nodeType
    const typeMap = {
      PDFNode: 'pdf',
      DocxNode: 'docx',
      BlogNode: 'html',
      VideoNode: 'video',
      EmailNode: 'email_log',
    };

    const artifact = {
      id: `art_${crypto.randomUUID().slice(0, 12)}`,
      agentId,
      executionId,
      nodeId,
      nodeType,
      type: typeMap[nodeType] || 'unknown',
      filename: resolvedFilename,
      relativePath: relativePath.replace(/\\/g, '/'),
      absolutePath: filePath.replace(/\\/g, '/'),
      sizeBytes: stats.size,
      mimeType: mimeType || 'application/octet-stream',
      createdAt: new Date().toISOString(),
      metadata,
    };

    // Register in data.json
    const data = readData();
    if (!Array.isArray(data.artifacts)) {
      data.artifacts = [];
    }
    data.artifacts.push(artifact);
    writeData(data);

    // Push event to renderer
    try {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0 && !wins[0].isDestroyed()) {
        wins[0].webContents.send('artifact:created', artifact);
      }
    } catch { /* ignore */ }

    return { success: true, artifact };
  }

  /**
   * List artifacts with optional filters.
   */
  list(filters = {}) {
    const data = readData();
    let artifacts = data.artifacts || [];

    if (filters.agentId) {
      artifacts = artifacts.filter((a) => a.agentId === filters.agentId);
    }
    if (filters.type) {
      artifacts = artifacts.filter((a) => a.type === filters.type);
    }
    if (filters.executionId) {
      artifacts = artifacts.filter((a) => a.executionId === filters.executionId);
    }

    // Sort newest first
    artifacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return artifacts;
  }

  /**
   * Open an artifact in the OS default app.
   */
  async open(artifactId) {
    const data = readData();
    const artifact = (data.artifacts || []).find((a) => a.id === artifactId);
    if (!artifact) return { success: false, error: 'Artifact not found' };

    const absPath = path.join(DATA_DIR, artifact.relativePath);
    if (!fs.existsSync(absPath)) return { success: false, error: 'File not found on disk' };

    await shell.openPath(absPath);
    return { success: true };
  }

  /**
   * Delete an artifact (file + metadata).
   */
  delete(artifactId) {
    const data = readData();
    const idx = (data.artifacts || []).findIndex((a) => a.id === artifactId);
    if (idx === -1) return { success: false, error: 'Artifact not found' };

    const artifact = data.artifacts[idx];
    const absPath = path.join(DATA_DIR, artifact.relativePath);

    // Remove file
    try {
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch { /* ignore */ }

    // Remove from metadata
    data.artifacts.splice(idx, 1);
    writeData(data);

    return { success: true };
  }

  /**
   * Open the artifacts base directory in the file explorer.
   */
  async openFolder() {
    ensureDir(ARTIFACTS_DIR);
    await shell.openPath(ARTIFACTS_DIR);
    return { success: true };
  }
}

module.exports = ArtifactManager;
