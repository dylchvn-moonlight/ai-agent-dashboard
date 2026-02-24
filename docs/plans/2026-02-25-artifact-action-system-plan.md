# Artifact & Action System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 action node types (Email, PDF, DOCX, Blog, Video), an artifact storage system, and two frontend views (per-agent outputs + global media library) so agents can produce real files and send emails.

**Architecture:** New action nodes plug into the existing React Flow editor and agent-engine DAG execution. A new artifact storage layer on disk (`%APPDATA%/AIAgentDashboard/artifacts/`) persists files. IPC handlers in main.js manage file CRUD and email sending. A new Zustand store (`artifact-store.js`) provides frontend state. The approach follows existing patterns exactly — BaseNode wrapper, NodeConfig fields, node-types registry.

**Tech Stack:** Electron 28, React 18, Vite 5, React Flow, Zustand, nodemailer (SMTP), pdfkit (PDF), docx (DOCX), marked (markdown-to-HTML), fluent-ffmpeg + ffmpeg-static (video)

**Design doc:** `docs/plans/2026-02-25-artifact-action-system-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install npm packages in /tmp (WSL pattern)**

```bash
cd /tmp && mkdir -p ai-agent-deps && cd ai-agent-deps
npm init -y
npm install nodemailer pdfkit docx marked fluent-ffmpeg ffmpeg-static
```

**Step 2: Copy node_modules into project**

```bash
# Copy each new package into the project's node_modules
cp -r /tmp/ai-agent-deps/node_modules/nodemailer "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
cp -r /tmp/ai-agent-deps/node_modules/pdfkit "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
cp -r /tmp/ai-agent-deps/node_modules/docx "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
cp -r /tmp/ai-agent-deps/node_modules/marked "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
cp -r /tmp/ai-agent-deps/node_modules/fluent-ffmpeg "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
cp -r /tmp/ai-agent-deps/node_modules/ffmpeg-static "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI/node_modules/"
```

Also copy any transitive dependencies that aren't already in the project (e.g., `pdfkit` depends on `fontkit`, `png-js`, `restructure`, etc.). Check `node_modules/pdfkit/node_modules/` and `node_modules/docx/node_modules/` for any nested deps and copy those too.

**Step 3: Update package.json dependencies**

Add to `dependencies` in `package.json`:

```json
"nodemailer": "^6.9.0",
"pdfkit": "^0.15.0",
"docx": "^9.0.0",
"marked": "^15.0.0",
"fluent-ffmpeg": "^2.1.0",
"ffmpeg-static": "^5.2.0"
```

Add to `build.extraResources` in `package.json` (after the existing `build.files` array):

```json
"extraResources": [
  {
    "from": "node_modules/ffmpeg-static/ffmpeg.exe",
    "to": "ffmpeg/ffmpeg.exe"
  }
]
```

**Step 4: Verify packages load**

```bash
cd "/mnt/c/Users/Dylan/Documents/Claude Code/Claude Code Folder/AI Agent UI"
node -e "require('nodemailer'); require('pdfkit'); require('docx'); require('marked'); require('fluent-ffmpeg'); console.log('All packages loaded OK')"
```

Expected: `All packages loaded OK`

---

## Task 2: CSS Variable + Design System Update

**Files:**
- Modify: `src/styles/variables.css:27` (add after `--node-data`)

**Step 1: Add the action node color variable**

In `src/styles/variables.css`, add after line 31 (`--node-data: #06B6D4;`):

```css
  --node-action: #F43F5E;
```

Also add `--rose: #F43F5E;` after the other accent colors (line 24, after `--cyan`).

---

## Task 3: Node Type Registry — Add 5 Action Nodes

**Files:**
- Modify: `src/lib/node-types.js:1-198`

**Step 1: Add icon imports**

At line 1-4 of `src/lib/node-types.js`, update the lucide imports to include:

```js
import {
  MessageSquare, Brain, Wrench, Globe, GitBranch, Repeat,
  Database, Send, Code, Wifi, Route, Shuffle, Bot,
  Mail, FileText, FileType, Globe2, Video
} from 'lucide-react';
```

**Step 2: Add "Actions" category**

After the `'Data'` category (line 31), add:

```js
  'Actions': {
    color: 'var(--node-action)',
    colorClass: 'node-action',
    nodes: ['EmailNode', 'PDFNode', 'DocxNode', 'BlogNode', 'VideoNode'],
  },
```

**Step 3: Add 5 NODE_DEFINITIONS entries**

After the `SubAgentNode` definition (line 197), add:

```js
  EmailNode: {
    label: 'Email',
    icon: Mail,
    category: 'Actions',
    color: 'var(--node-action)',
    description: 'Send email via SMTP',
    defaultData: {
      label: 'Send Email',
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      bodyTemplate: '{{input}}',
      attachFromUpstream: false,
    },
  },
  PDFNode: {
    label: 'PDF',
    icon: FileText,
    category: 'Actions',
    color: 'var(--node-action)',
    description: 'Generate PDF document',
    defaultData: {
      label: 'Generate PDF',
      filenameTemplate: 'output-{{date}}',
      pageSize: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      includeHeader: false,
      headerText: '',
      includeFooter: false,
      footerText: '',
    },
  },
  DocxNode: {
    label: 'DOCX',
    icon: FileType,
    category: 'Actions',
    color: 'var(--node-action)',
    description: 'Generate Word document',
    defaultData: {
      label: 'Generate DOCX',
      filenameTemplate: 'document-{{date}}',
      documentTitle: '',
      fontSize: 12,
      fontFamily: 'Arial',
    },
  },
  BlogNode: {
    label: 'Blog',
    icon: Globe2,
    category: 'Actions',
    color: 'var(--node-action)',
    description: 'Render markdown to styled HTML',
    defaultData: {
      label: 'Generate Blog',
      filenameTemplate: 'blog-{{date}}',
      cssTheme: 'modern',
      pageTitle: '',
      metaDescription: '',
      includeTableOfContents: false,
    },
  },
  VideoNode: {
    label: 'Video',
    icon: Video,
    category: 'Actions',
    color: 'var(--node-action)',
    description: 'Compose video from media',
    defaultData: {
      label: 'Create Video',
      filenameTemplate: 'video-{{date}}',
      inputType: 'single_image_with_audio',
      audioSource: '',
      fps: 30,
      resolution: '1920x1080',
      codec: 'libx264',
    },
  },
```

---

## Task 4: React Flow Node Components — 5 New Nodes

**Files:**
- Create: `src/nodes/EmailNode.jsx`
- Create: `src/nodes/PDFNode.jsx`
- Create: `src/nodes/DocxNode.jsx`
- Create: `src/nodes/BlogNode.jsx`
- Create: `src/nodes/VideoNode.jsx`
- Modify: `src/nodes/index.js`

**Step 1: Create EmailNode.jsx**

```jsx
import { Mail } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function EmailNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Send Email'}
      icon={Mail}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.to || 'No recipient set'}
      </span>
      {data.subject && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          {data.subject}
        </span>
      )}
    </BaseNode>
  );
}
```

**Step 2: Create PDFNode.jsx**

```jsx
import { FileText } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function PDFNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Generate PDF'}
      icon={FileText}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        {data.pageSize || 'A4'} / .pdf
      </span>
    </BaseNode>
  );
}
```

**Step 3: Create DocxNode.jsx**

```jsx
import { FileType } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function DocxNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Generate DOCX'}
      icon={FileType}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        .docx
      </span>
    </BaseNode>
  );
}
```

**Step 4: Create BlogNode.jsx**

```jsx
import { Globe2 } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function BlogNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Generate Blog'}
      icon={Globe2}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        {data.cssTheme || 'modern'} / .html
      </span>
    </BaseNode>
  );
}
```

**Step 5: Create VideoNode.jsx**

```jsx
import { Video } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function VideoNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Create Video'}
      icon={Video}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        {data.resolution || '1920x1080'} / .mp4
      </span>
    </BaseNode>
  );
}
```

**Step 6: Update src/nodes/index.js**

Replace the entire file:

```js
import InputNode from './InputNode';
import OutputNode from './OutputNode';
import LLMNode from './LLMNode';
import MemoryNode from './MemoryNode';
import ToolNode from './ToolNode';
import ScraperNode from './ScraperNode';
import HTTPNode from './HTTPNode';
import CodeNode from './CodeNode';
import ConditionNode from './ConditionNode';
import LoopNode from './LoopNode';
import RouterNode from './RouterNode';
import TransformNode from './TransformNode';
import SubAgentNode from './SubAgentNode';
import EmailNode from './EmailNode';
import PDFNode from './PDFNode';
import DocxNode from './DocxNode';
import BlogNode from './BlogNode';
import VideoNode from './VideoNode';

export const nodeTypes = {
  InputNode,
  OutputNode,
  LLMNode,
  MemoryNode,
  ToolNode,
  ScraperNode,
  HTTPNode,
  CodeNode,
  ConditionNode,
  LoopNode,
  RouterNode,
  TransformNode,
  SubAgentNode,
  EmailNode,
  PDFNode,
  DocxNode,
  BlogNode,
  VideoNode,
};

export {
  InputNode,
  OutputNode,
  LLMNode,
  MemoryNode,
  ToolNode,
  ScraperNode,
  HTTPNode,
  CodeNode,
  ConditionNode,
  LoopNode,
  RouterNode,
  TransformNode,
  SubAgentNode,
  EmailNode,
  PDFNode,
  DocxNode,
  BlogNode,
  VideoNode,
};
```

---

## Task 5: NodeConfig — Add Config Forms for Action Nodes

**Files:**
- Modify: `src/components/NodeConfig.jsx:69-82` (add new field group entries)
- Modify: `src/components/NodeConfig.jsx` (add 5 new field group functions)

**Step 1: Add config dispatch lines**

In `NodeConfig.jsx`, after line 81 (`{node.type === 'ToolNode' && ...}`), add:

```jsx
        {node.type === 'EmailNode' && <EmailFields data={node.data} update={update} />}
        {node.type === 'PDFNode' && <PDFFields data={node.data} update={update} />}
        {node.type === 'DocxNode' && <DocxFields data={node.data} update={update} />}
        {node.type === 'BlogNode' && <BlogFields data={node.data} update={update} />}
        {node.type === 'VideoNode' && <VideoFields data={node.data} update={update} />}
```

**Step 2: Add EmailFields function**

Add before the `/* ─── Reusable Form Primitives ─── */` comment (before `function Field`):

```jsx
function EmailFields({ data, update }) {
  return (
    <>
      <Field label="To">
        <TextInput
          value={data.to || ''}
          onChange={(v) => update('to', v)}
          placeholder="recipient@example.com"
        />
      </Field>
      <Field label="CC">
        <TextInput
          value={data.cc || ''}
          onChange={(v) => update('cc', v)}
          placeholder="cc@example.com"
        />
      </Field>
      <Field label="BCC">
        <TextInput
          value={data.bcc || ''}
          onChange={(v) => update('bcc', v)}
          placeholder="bcc@example.com"
        />
      </Field>
      <Field label="Subject">
        <TextInput
          value={data.subject || ''}
          onChange={(v) => update('subject', v)}
          placeholder="Email subject line..."
        />
      </Field>
      <Field label="Body Template">
        <TextArea
          value={data.bodyTemplate || '{{input}}'}
          onChange={(v) => update('bodyTemplate', v)}
          placeholder="Use {{input}} for upstream content"
          rows={5}
        />
      </Field>
      <Field label="Attach upstream files">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.attachFromUpstream || false}
            onChange={(e) => update('attachFromUpstream', e.target.checked)}
            className="accent-[var(--node-action)]"
          />
          <span className="text-xs text-[var(--tx)]">Auto-attach artifacts from upstream nodes</span>
        </label>
      </Field>
    </>
  );
}

function PDFFields({ data, update }) {
  return (
    <>
      <Field label="Filename">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="output-{{date}}"
        />
      </Field>
      <Field label="Page Size">
        <SelectInput
          value={data.pageSize || 'A4'}
          onChange={(v) => update('pageSize', v)}
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'Letter', label: 'Letter' },
            { value: 'Legal', label: 'Legal' },
          ]}
        />
      </Field>
      <Field label="Include Header">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.includeHeader || false}
            onChange={(e) => update('includeHeader', e.target.checked)}
            className="accent-[var(--node-action)]"
          />
          <span className="text-xs text-[var(--tx)]">Add header to each page</span>
        </label>
      </Field>
      {data.includeHeader && (
        <Field label="Header Text">
          <TextInput
            value={data.headerText || ''}
            onChange={(v) => update('headerText', v)}
            placeholder="Header text..."
          />
        </Field>
      )}
      <Field label="Include Footer">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.includeFooter || false}
            onChange={(e) => update('includeFooter', e.target.checked)}
            className="accent-[var(--node-action)]"
          />
          <span className="text-xs text-[var(--tx)]">Add footer to each page</span>
        </label>
      </Field>
      {data.includeFooter && (
        <Field label="Footer Text">
          <TextInput
            value={data.footerText || ''}
            onChange={(v) => update('footerText', v)}
            placeholder="Footer text..."
          />
        </Field>
      )}
    </>
  );
}

function DocxFields({ data, update }) {
  return (
    <>
      <Field label="Filename">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="document-{{date}}"
        />
      </Field>
      <Field label="Document Title">
        <TextInput
          value={data.documentTitle || ''}
          onChange={(v) => update('documentTitle', v)}
          placeholder="My Document"
        />
      </Field>
      <Field label="Font Size">
        <TextInput
          type="number"
          value={data.fontSize ?? 12}
          onChange={(v) => update('fontSize', parseInt(v) || 12)}
          placeholder="12"
        />
      </Field>
      <Field label="Font Family">
        <SelectInput
          value={data.fontFamily || 'Arial'}
          onChange={(v) => update('fontFamily', v)}
          options={[
            { value: 'Arial', label: 'Arial' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Calibri', label: 'Calibri' },
            { value: 'Courier New', label: 'Courier New' },
          ]}
        />
      </Field>
    </>
  );
}

function BlogFields({ data, update }) {
  return (
    <>
      <Field label="Filename">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="blog-{{date}}"
        />
      </Field>
      <Field label="Page Title">
        <TextInput
          value={data.pageTitle || ''}
          onChange={(v) => update('pageTitle', v)}
          placeholder="My Blog Post"
        />
      </Field>
      <Field label="CSS Theme">
        <SelectInput
          value={data.cssTheme || 'modern'}
          onChange={(v) => update('cssTheme', v)}
          options={[
            { value: 'minimal', label: 'Minimal' },
            { value: 'modern', label: 'Modern' },
            { value: 'newspaper', label: 'Newspaper' },
          ]}
        />
      </Field>
      <Field label="Meta Description">
        <TextArea
          value={data.metaDescription || ''}
          onChange={(v) => update('metaDescription', v)}
          placeholder="Brief description for SEO..."
          rows={2}
        />
      </Field>
      <Field label="Table of Contents">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.includeTableOfContents || false}
            onChange={(e) => update('includeTableOfContents', e.target.checked)}
            className="accent-[var(--node-action)]"
          />
          <span className="text-xs text-[var(--tx)]">Auto-generate table of contents</span>
        </label>
      </Field>
    </>
  );
}

function VideoFields({ data, update }) {
  return (
    <>
      <Field label="Filename">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="video-{{date}}"
        />
      </Field>
      <Field label="Input Type">
        <SelectInput
          value={data.inputType || 'single_image_with_audio'}
          onChange={(v) => update('inputType', v)}
          options={[
            { value: 'single_image_with_audio', label: 'Image + Audio' },
            { value: 'images_dir', label: 'Image Directory' },
            { value: 'image_list', label: 'Image List (from upstream)' },
          ]}
        />
      </Field>
      <Field label="Audio Source">
        <TextInput
          value={data.audioSource || ''}
          onChange={(v) => update('audioSource', v)}
          placeholder="Path to audio file, or leave empty"
        />
      </Field>
      <Field label="FPS">
        <TextInput
          type="number"
          value={data.fps ?? 30}
          onChange={(v) => update('fps', parseInt(v) || 30)}
          placeholder="30"
        />
      </Field>
      <Field label="Resolution">
        <SelectInput
          value={data.resolution || '1920x1080'}
          onChange={(v) => update('resolution', v)}
          options={[
            { value: '1920x1080', label: '1080p (1920x1080)' },
            { value: '1280x720', label: '720p (1280x720)' },
            { value: '3840x2160', label: '4K (3840x2160)' },
            { value: '1080x1920', label: '9:16 Vertical (1080x1920)' },
          ]}
        />
      </Field>
      <Field label="Codec">
        <SelectInput
          value={data.codec || 'libx264'}
          onChange={(v) => update('codec', v)}
          options={[
            { value: 'libx264', label: 'H.264 (libx264)' },
            { value: 'libx265', label: 'H.265 (libx265)' },
            { value: 'libvpx-vp9', label: 'VP9 (WebM)' },
          ]}
        />
      </Field>
    </>
  );
}
```

---

## Task 6: Artifact IPC Handlers + Storage Backend

**Files:**
- Create: `artifact-manager.js` (new main-process module)
- Modify: `main.js` (add IPC handlers)
- Modify: `preload.js` (add bridge methods)

**Step 1: Create artifact-manager.js**

Create `artifact-manager.js` in the project root (next to `main.js`):

```js
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
```

**Step 2: Add IPC handlers to main.js**

After the `const agentEngine = new AgentEngine();` line (~line 374), add:

```js
const ArtifactManager = require('./artifact-manager');
const artifactManager = new ArtifactManager();

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
```

**Step 3: Update preload.js**

Add before the closing `});` of `contextBridge.exposeInMainWorld`:

```js
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
```

Also add `build.files` entry in `package.json`: `"artifact-manager.js"` to the files array.

---

## Task 7: Email IPC Handlers (Nodemailer + SMTP)

**Files:**
- Modify: `main.js` (add email IPC handlers)
- Modify: `preload.js` (add email bridge methods)

**Step 1: Add email IPC handlers to main.js**

After the artifact handlers:

```js
// --- Email IPC Handlers (Nodemailer) ---
const nodemailer = require('nodemailer');

async function buildSmtpTransporter() {
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
```

**Step 2: Add email bridge methods to preload.js**

```js
  // Email
  sendEmail: (message) => ipcRenderer.invoke('email:send', message),
  testEmailConnection: () => ipcRenderer.invoke('email:test'),
```

---

## Task 8: Agent Engine — Add 5 Action Node Executors

**Files:**
- Modify: `agent-engine.js:379-422` (add cases to `_executeNode` switch)
- Modify: `agent-engine.js` (add 5 new executor methods)

**Step 1: Add switch cases in `_executeNode`**

In the switch statement at line 379, add before `default:`:

```js
      case 'EmailNode':
        return this._execEmail(nodeData, nodeInput, credentials, context, edges, nodeId);

      case 'PDFNode':
        return this._execPDF(nodeData, nodeInput, agent.id, executionId);

      case 'DocxNode':
        return this._execDocx(nodeData, nodeInput, agent.id, executionId);

      case 'BlogNode':
        return this._execBlog(nodeData, nodeInput, agent.id, executionId);

      case 'VideoNode':
        return this._execVideo(nodeData, nodeInput, agent.id, executionId);
```

Note: `executionId` must be added as a parameter. Modify the `execute()` method to pass `executionId` into `_executeNode()` — add it as the last parameter in the call at ~line 219, and add it to the function signature at ~line 365.

**Step 2: Add requires at top of agent-engine.js**

After `const LLMRouter = require('./llm-router');` (line 8), add:

```js
const ArtifactManager = require('./artifact-manager');
const artifactManager = new ArtifactManager();
```

**Step 3: Add executor methods**

Add these methods inside the `AgentEngine` class, before `_evaluateCondition`:

```js
  /** EmailNode — send email via SMTP */
  async _execEmail(nodeData, nodeInput, credentials, context, edges, nodeId) {
    const nodemailer = require('nodemailer');

    const host = credentials['smtp-host'];
    const port = parseInt(credentials['smtp-port']) || 587;
    const secure = credentials['smtp-secure'] === 'true';
    const user = credentials['smtp-user'];
    const pass = credentials['smtp-pass'];
    const fromName = credentials['smtp-from-name'] || 'AI Agent';
    const fromEmail = credentials['smtp-from-email'] || user;

    if (!host || !user) {
      throw new Error('SMTP not configured. Go to Settings > Email to set up.');
    }

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
    });

    // Resolve template
    const body = (nodeData.bodyTemplate || '{{input}}').replace(/\{\{input\}\}/g, nodeInput);
    const subject = (nodeData.subject || 'Agent Output').replace(/\{\{input\}\}/g, nodeInput.slice(0, 100));
    const to = nodeData.to;

    if (!to) throw new Error('EmailNode: no "to" address configured.');

    // Collect upstream artifacts as attachments
    const attachments = [];
    if (nodeData.attachFromUpstream) {
      for (const edge of edges) {
        if (edge.target === nodeId && context.has(edge.source)) {
          const upstream = context.get(edge.source);
          if (upstream && typeof upstream === 'object' && upstream.__artifact) {
            attachments.push({
              filename: upstream.filename,
              path: upstream.filePath,
            });
          }
        }
      }
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      cc: nodeData.cc || undefined,
      bcc: nodeData.bcc || undefined,
      subject,
      html: body,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return { sent: true, messageId: info.messageId, to, subject };
  }

  /** PDFNode — generate PDF from content */
  async _execPDF(nodeData, nodeInput, agentId, executionId) {
    const PDFDocument = require('pdfkit');

    const filename = (nodeData.filenameTemplate || 'output-{{date}}') + '.pdf';
    const pageSize = nodeData.pageSize || 'A4';

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: pageSize, margin: 40 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const result = artifactManager.save({
            agentId, executionId,
            nodeId: 'pdf', nodeType: 'PDFNode',
            filename, buffer,
            mimeType: 'application/pdf',
          });

          if (result.success) {
            resolve({
              __artifact: true,
              artifactId: result.artifact.id,
              filePath: result.artifact.absolutePath,
              filename: result.artifact.filename,
              type: 'pdf',
              mimeType: 'application/pdf',
            });
          } else {
            reject(new Error('Failed to save PDF artifact'));
          }
        });
        doc.on('error', reject);

        // Add header if configured
        if (nodeData.includeHeader && nodeData.headerText) {
          doc.fontSize(9).fillColor('#888888').text(nodeData.headerText, { align: 'center' });
          doc.moveDown(0.5);
          doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#cccccc');
          doc.moveDown(0.5);
        }

        // Write content — parse basic markdown-like formatting
        const lines = nodeInput.split('\n');
        for (const line of lines) {
          if (line.startsWith('# ')) {
            doc.fontSize(22).fillColor('#000000').text(line.slice(2), { continued: false });
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.fontSize(18).fillColor('#222222').text(line.slice(3), { continued: false });
            doc.moveDown(0.2);
          } else if (line.startsWith('### ')) {
            doc.fontSize(14).fillColor('#333333').text(line.slice(4), { continued: false });
            doc.moveDown(0.2);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.fontSize(11).fillColor('#000000').text(`  \u2022  ${line.slice(2)}`, { continued: false });
          } else if (line.trim() === '') {
            doc.moveDown(0.5);
          } else {
            doc.fontSize(11).fillColor('#000000').text(line, { continued: false });
          }
        }

        // Add footer if configured
        if (nodeData.includeFooter && nodeData.footerText) {
          doc.fontSize(9).fillColor('#888888').text(nodeData.footerText, 40, doc.page.height - 50, { align: 'center' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /** DocxNode — generate Word document */
  async _execDocx(nodeData, nodeInput, agentId, executionId) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

    const filename = (nodeData.filenameTemplate || 'document-{{date}}') + '.docx';
    const fontSize = (nodeData.fontSize || 12) * 2; // docx uses half-points
    const fontFamily = nodeData.fontFamily || 'Arial';

    // Parse input into paragraphs
    const children = [];
    const lines = nodeInput.split('\n');

    if (nodeData.documentTitle) {
      children.push(new Paragraph({
        children: [new TextRun({ text: nodeData.documentTitle, bold: true, size: 32, font: fontFamily })],
        heading: HeadingLevel.TITLE,
      }));
    }

    for (const line of lines) {
      if (line.startsWith('# ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), bold: true, size: 28, font: fontFamily })],
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(3), bold: true, size: 24, font: fontFamily })],
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(4), bold: true, size: 22, font: fontFamily })],
          heading: HeadingLevel.HEADING_3,
        }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), size: fontSize, font: fontFamily })],
          bullet: { level: 0 },
        }));
      } else if (line.trim() === '') {
        children.push(new Paragraph({ children: [] }));
      } else {
        // Handle **bold** and *italic*
        const runs = [];
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: fontSize, font: fontFamily }));
          } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size: fontSize, font: fontFamily }));
          } else {
            runs.push(new TextRun({ text: part, size: fontSize, font: fontFamily }));
          }
        }
        children.push(new Paragraph({ children: runs }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    const result = artifactManager.save({
      agentId, executionId,
      nodeId: 'docx', nodeType: 'DocxNode',
      filename, buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    if (!result.success) throw new Error('Failed to save DOCX artifact');

    return {
      __artifact: true,
      artifactId: result.artifact.id,
      filePath: result.artifact.absolutePath,
      filename: result.artifact.filename,
      type: 'docx',
      mimeType: result.artifact.mimeType,
    };
  }

  /** BlogNode — render markdown to styled HTML */
  _execBlog(nodeData, nodeInput, agentId, executionId) {
    const { marked } = require('marked');

    const filename = (nodeData.filenameTemplate || 'blog-{{date}}') + '.html';
    const title = nodeData.pageTitle || 'Blog Post';
    const theme = nodeData.cssTheme || 'modern';
    const meta = nodeData.metaDescription || '';

    const htmlContent = marked(nodeInput);

    // CSS themes
    const themes = {
      minimal: 'body{font-family:system-ui,sans-serif;max-width:700px;margin:2rem auto;padding:0 1rem;color:#333;line-height:1.7}h1,h2,h3{color:#111}a{color:#2563EB}pre{background:#f5f5f5;padding:1rem;border-radius:6px;overflow-x:auto}code{font-size:0.9em}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1rem;color:#666}',
      modern: 'body{font-family:"Inter",system-ui,sans-serif;max-width:750px;margin:3rem auto;padding:0 1.5rem;color:#e2e8f0;background:#0f172a;line-height:1.8}h1{font-size:2.2rem;background:linear-gradient(135deg,#3b82f6,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}h2{color:#93c5fd;border-bottom:1px solid #1e293b;padding-bottom:0.5rem}h3{color:#c4b5fd}a{color:#60a5fa}pre{background:#1e293b;padding:1rem;border-radius:8px;border:1px solid #334155;overflow-x:auto}code{color:#f472b6;font-size:0.9em}blockquote{border-left:3px solid #3b82f6;margin-left:0;padding-left:1rem;color:#94a3b8}img{max-width:100%;border-radius:8px}',
      newspaper: 'body{font-family:Georgia,"Times New Roman",serif;max-width:680px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.8}h1{font-size:2.5rem;text-align:center;border-bottom:2px solid #000;padding-bottom:0.5rem;margin-bottom:1.5rem}h2{font-size:1.5rem;border-bottom:1px solid #ccc;padding-bottom:0.3rem}p:first-of-type::first-letter{font-size:3rem;float:left;line-height:1;margin-right:0.1em;font-weight:bold}a{color:#1a1a1a;text-decoration:underline}blockquote{font-style:italic;border-left:3px solid #000;margin-left:0;padding-left:1rem}',
    };

    const css = themes[theme] || themes.modern;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${meta.replace(/"/g, '&quot;')}">
  <title>${title.replace(/</g, '&lt;')}</title>
  <style>${css}</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const result = artifactManager.save({
      agentId, executionId,
      nodeId: 'blog', nodeType: 'BlogNode',
      filename, buffer: fullHtml,
      mimeType: 'text/html',
    });

    if (!result.success) throw new Error('Failed to save blog artifact');

    return {
      __artifact: true,
      artifactId: result.artifact.id,
      filePath: result.artifact.absolutePath,
      filename: result.artifact.filename,
      type: 'html',
      mimeType: 'text/html',
    };
  }

  /** VideoNode — compose video via FFmpeg */
  async _execVideo(nodeData, nodeInput, agentId, executionId) {
    const ffmpeg = require('fluent-ffmpeg');
    let ffmpegPath;
    try {
      ffmpegPath = require('ffmpeg-static');
    } catch {
      throw new Error('ffmpeg-static not installed. Video generation requires FFmpeg.');
    }
    ffmpeg.setFfmpegPath(ffmpegPath);

    const filename = (nodeData.filenameTemplate || 'video-{{date}}') + '.mp4';
    const fps = nodeData.fps || 30;
    const resolution = nodeData.resolution || '1920x1080';
    const [width, height] = resolution.split('x').map(Number);
    const codec = nodeData.codec || 'libx264';

    // Resolve output path
    const resolvedFilename = filename
      .replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10))
      .replace(/\{\{time\}\}/g, new Date().toISOString().slice(11, 19).replace(/:/g, '-'))
      .replace(/\{\{timestamp\}\}/g, Date.now().toString());
    const dir = require('path').join(artifactManager.getArtifactsDir(), agentId, executionId);
    require('fs').mkdirSync(dir, { recursive: true });
    const outputPath = require('path').join(dir, resolvedFilename);

    // Parse input for image/audio paths
    let imagePath = nodeData.imagePath || '';
    let audioPath = nodeData.audioSource || '';

    // If upstream provided paths as JSON
    if (nodeInput) {
      try {
        const parsed = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
        if (parsed.image) imagePath = parsed.image;
        if (parsed.audio) audioPath = parsed.audio;
        if (parsed.images) imagePath = parsed.images; // directory or pattern
      } catch {
        // nodeInput is not JSON — might be a file path
        if (nodeInput.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
          imagePath = nodeInput;
        }
      }
    }

    if (!imagePath && !audioPath) {
      throw new Error('VideoNode: no image or audio source provided.');
    }

    return new Promise((resolve, reject) => {
      let cmd = ffmpeg();

      if (imagePath) {
        cmd = cmd.input(imagePath);
        if (nodeData.inputType === 'single_image_with_audio') {
          cmd = cmd.loop();
        } else {
          cmd = cmd.inputFPS(fps);
        }
      }

      if (audioPath) {
        cmd = cmd.input(audioPath).audioCodec('aac');
      }

      cmd
        .videoCodec(codec)
        .size(`${width}x${height}`)
        .outputOptions(['-pix_fmt', 'yuv420p'])
        .fps(fps);

      if (audioPath && nodeData.inputType === 'single_image_with_audio') {
        cmd = cmd.outputOptions(['-shortest']);
      }

      cmd
        .output(outputPath)
        .on('end', () => {
          const fs = require('fs');
          const stats = fs.statSync(outputPath);
          const DATA_DIR = require('path').join(require('electron').app.getPath('userData'), 'AIAgentDashboard');
          const relativePath = require('path').relative(DATA_DIR, outputPath).replace(/\\/g, '/');

          // Register artifact manually (since we already wrote the file)
          const data = JSON.parse(fs.readFileSync(require('path').join(DATA_DIR, 'data.json'), 'utf-8'));
          if (!Array.isArray(data.artifacts)) data.artifacts = [];
          const artifact = {
            id: `art_${require('crypto').randomUUID().slice(0, 12)}`,
            agentId, executionId,
            nodeId: 'video', nodeType: 'VideoNode',
            type: 'video',
            filename: resolvedFilename,
            relativePath,
            absolutePath: outputPath.replace(/\\/g, '/'),
            sizeBytes: stats.size,
            mimeType: 'video/mp4',
            createdAt: new Date().toISOString(),
            metadata: { fps, resolution, codec },
          };
          data.artifacts.push(artifact);
          fs.writeFileSync(require('path').join(DATA_DIR, 'data.json'), JSON.stringify(data, null, 2));

          resolve({
            __artifact: true,
            artifactId: artifact.id,
            filePath: artifact.absolutePath,
            filename: artifact.filename,
            type: 'video',
            mimeType: 'video/mp4',
          });
        })
        .on('error', (err) => {
          reject(new Error(`VideoNode FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }
```

---

## Task 9: Artifact Zustand Store

**Files:**
- Create: `src/stores/artifact-store.js`

**Step 1: Create the store**

```js
import { create } from 'zustand';

const useArtifactStore = create((set, get) => ({
  artifacts: [],
  loading: false,
  filters: { agentId: null, type: null },

  loadArtifacts: async (filters = {}) => {
    set({ loading: true });
    try {
      const artifacts = await window.electronAPI?.listArtifacts(filters);
      set({ artifacts: artifacts || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addArtifact: (artifact) => {
    set((state) => ({
      artifacts: [artifact, ...state.artifacts],
    }));
  },

  deleteArtifact: async (artifactId) => {
    const result = await window.electronAPI?.deleteArtifact(artifactId);
    if (result?.success) {
      set((state) => ({
        artifacts: state.artifacts.filter((a) => a.id !== artifactId),
      }));
    }
    return result;
  },

  openArtifact: async (artifactId) => {
    return await window.electronAPI?.openArtifact(artifactId);
  },

  getAgentArtifacts: (agentId) => {
    return get().artifacts.filter((a) => a.agentId === agentId);
  },

  getTotalStorageUsed: () => {
    return get().artifacts.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  },

  setFilters: (filters) => {
    set({ filters });
    get().loadArtifacts(filters);
  },
}));

export default useArtifactStore;
```

---

## Task 10: SMTP Settings UI Section

**Files:**
- Modify: `src/views/Settings.jsx`

**Step 1: Add SMTP section**

Add a new section in Settings.jsx for email configuration. This follows the existing pattern of credential input sections. Add an "Email / SMTP" section after the existing provider sections. The section should have:

- Text inputs for: SMTP Host, SMTP Port, Username, From Name, From Email
- Password input for: SMTP Password
- Checkbox for: Use TLS
- "Test Connection" button that calls `window.electronAPI.testEmailConnection()`
- Success/error feedback toast

Each field saves via `window.electronAPI.saveCredential(key, value)` using the keys: `smtp-host`, `smtp-port`, `smtp-secure`, `smtp-user`, `smtp-pass`, `smtp-from-name`, `smtp-from-email`.

---

## Task 11: Media Library View

**Files:**
- Create: `src/views/MediaLibrary.jsx`
- Modify: `src/components/Sidebar.jsx:16-24` (add nav item)
- Modify: `src/App.jsx:18-26` (add to VIEW_MAP)
- Modify: `src/stores/ui-store.js` (no changes needed — `setView` already generic)

**Step 1: Create MediaLibrary.jsx**

A new view showing all artifacts across all agents with:
- Stats row: total count, total storage, breakdown by type
- Filter bar: agent dropdown, type filter buttons (PDF/DOCX/HTML/Video/Email)
- Search input for filename
- Grid of artifact cards (icon by type, filename, agent name, date, size)
- Click to open in OS app
- Delete button per card
- "Open Folder" button to open artifacts directory

**Step 2: Add to Sidebar.jsx**

In the `NAV_ITEMS` array (line 16-24), add after `resources`:

```js
  { id: 'media', label: 'Media Library', icon: FolderOpen },
```

Add `FolderOpen` to the lucide imports at line 1.

**Step 3: Add to App.jsx VIEW_MAP**

```js
import MediaLibrary from '@/views/MediaLibrary';

// In VIEW_MAP:
  media: MediaLibrary,
```

---

## Task 12: Update AI-AGENT-DASHBOARD.md

**Files:**
- Modify: `AI-AGENT-DASHBOARD.md`

**Step 1: Update changelog**

Add a v0.4.0 changelog entry documenting all new features:
- 5 action node types
- Artifact storage system
- SMTP email integration
- Media Library view
- New dependencies

**Step 2: Update project structure**

Add new files to the project structure section.

**Step 3: Update node categories table**

Add the Actions category row.

**Step 4: Update IPC bridge contract**

Add artifact, email, and video IPC entries.

---

## Execution Order Summary

| Task | What | Dependencies |
|------|------|-------------|
| 1 | Install npm packages | None |
| 2 | CSS variable | None |
| 3 | Node type registry | Task 2 |
| 4 | Node components (5 files) | Task 3 |
| 5 | NodeConfig forms | Task 3 |
| 6 | Artifact manager + IPC | Task 1 |
| 7 | Email IPC (nodemailer) | Task 1 |
| 8 | Agent engine executors | Tasks 1, 6 |
| 9 | Artifact Zustand store | Task 6 |
| 10 | SMTP Settings UI | Task 7 |
| 11 | Media Library view | Task 9 |
| 12 | Documentation update | All |

Tasks 1 and 2 can run in parallel. Tasks 3-5 can run in parallel after 2. Tasks 6-7 can run in parallel after 1. Task 8 depends on both 1 and 6. Tasks 9-11 are sequential.
