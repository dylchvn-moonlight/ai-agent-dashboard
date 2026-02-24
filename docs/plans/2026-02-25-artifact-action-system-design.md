# Agent Artifact & Action System — Design Document

> **Date:** 2026-02-25 | **Status:** Approved | **Version:** 0.4.0
> **Approach:** Dedicated Action Nodes (Approach A)

---

## Problem

Agents currently produce text-only output. There is no way for an agent to:
- Send emails
- Generate PDFs, DOCX documents, or styled HTML blog posts
- Compose video from media inputs
- Store produced files for the user to access later

## Solution

Add 5 new **Action Node** types to the flow editor, an **Artifact Storage** system on disk, and two new frontend views (per-agent Outputs tab + global Media Library).

---

## 1. New Node Types

Category: **Actions** | Color: **Rose `#F43F5E`**

### EmailNode
- **Purpose:** Send email via SMTP
- **Config:** to, cc, bcc, subject, bodyTemplate (supports `{{input}}` interpolation), attachFromUpstream (boolean)
- **Behavior:** Sends email using stored SMTP credentials. Can attach artifacts produced by upstream nodes. Passes through input text to downstream nodes.
- **Artifact:** None (logs send status as output)

### PDFNode
- **Purpose:** Generate PDF from upstream content
- **Config:** filenameTemplate, pageSize (A4/Letter/Legal), margins, includeHeader, includeFooter, headerText, footerText
- **Behavior:** Takes upstream text/HTML, renders to PDF using Electron's `webContents.printToPDF()` for HTML content or `pdfkit` for structured data. Saves file to artifacts directory.
- **Artifact:** `.pdf` file

### DocxNode
- **Purpose:** Generate Word document
- **Config:** filenameTemplate, documentTitle, fontSize, fontFamily
- **Behavior:** Takes upstream text/markdown, converts to DOCX using the `docx` npm package. Saves file to artifacts directory.
- **Artifact:** `.docx` file

### BlogNode
- **Purpose:** Render markdown to styled HTML page
- **Config:** filenameTemplate, cssTheme (minimal/modern/newspaper), pageTitle, metaDescription, includeTableOfContents
- **Behavior:** Takes upstream markdown text, converts to HTML using `marked`, wraps in a styled HTML template. Saves file to artifacts directory.
- **Artifact:** `.html` file

### VideoNode
- **Purpose:** Compose images + audio into video
- **Config:** filenameTemplate, inputType (images_dir/image_list/single_image_with_audio), audioSource (file path or upstream), fps (default 30), resolution (1920x1080/1280x720/custom), codec (libx264)
- **Behavior:** Uses `fluent-ffmpeg` + `ffmpeg-static` to compose media. Saves file to artifacts directory.
- **Artifact:** `.mp4` file

### Node Component Pattern

All action nodes follow the existing `BaseNode` wrapper pattern:

```jsx
import BaseNode from './BaseNode';
import { Mail } from 'lucide-react';

const COLOR = 'var(--node-action)'; // #F43F5E

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
      <span className="text-[10px] text-[var(--dm)]">
        {data.to || 'No recipient set'}
      </span>
    </BaseNode>
  );
}
```

### Node Registration

In `src/nodes/index.js`, add all 5 types. In `src/lib/node-types.js`, add entries to the node type registry with defaults. In `src/components/NodePanel.jsx`, add "Actions" category section.

---

## 2. Artifact Storage

### File System Layout

```
%APPDATA%/AIAgentDashboard/
├── data.json
├── settings.json
├── credentials.json
└── artifacts/
    └── {agentId}/
        └── {executionId}/
            ├── blog-post-2026-02-25.html
            ├── report-2026-02-25.pdf
            └── summary-2026-02-25.docx
```

### Artifact Metadata (in data.json)

New top-level `artifacts` array:

```json
{
  "id": "art_abc123",
  "agentId": "agent-xyz",
  "executionId": "exec-789",
  "nodeId": "node-456",
  "nodeType": "PDFNode",
  "type": "pdf",
  "filename": "report-2026-02-25.pdf",
  "relativePath": "artifacts/agent-xyz/exec-789/report-2026-02-25.pdf",
  "absolutePath": "C:/Users/.../AIAgentDashboard/artifacts/agent-xyz/exec-789/report-2026-02-25.pdf",
  "sizeBytes": 45230,
  "mimeType": "application/pdf",
  "createdAt": "2026-02-25T14:30:00Z",
  "metadata": {}
}
```

Type values: `pdf | docx | html | video | email_log`

MIME types:
- pdf: `application/pdf`
- docx: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- html: `text/html`
- video: `video/mp4`
- email_log: `application/json`

---

## 3. IPC Handlers

### Artifact Management (main.js)

```
artifact:save       (agentId, executionId, nodeId, nodeType, filename, buffer, mimeType, metadata?)
                    → { success, artifact }

artifact:list       (filters?: { agentId?, type?, fromDate?, toDate? })
                    → artifact[]

artifact:open       (artifactId)
                    → opens in OS default app via shell.openPath()

artifact:delete     (artifactId)
                    → { success } (deletes file + removes from data.json)

artifact:get-dir    ()
                    → string (base artifacts directory path)

artifact:export     (artifactId, destinationPath)
                    → { success } (copies artifact to user-chosen location)
```

### Email (main.js)

```
email:send          (message: { to, cc?, bcc?, subject, html, text?, attachments?: [{filename, path}] })
                    → { success, messageId } | { success: false, error }

email:test          ()
                    → { success } | { success: false, error }
```

SMTP config is read from encrypted credentials (`smtp-host`, `smtp-port`, `smtp-secure`, `smtp-user`, `smtp-pass`, `smtp-from-name`, `smtp-from-email`).

### Video (main.js)

```
video:compose       (config: { inputImages, audioPath?, outputPath, fps?, resolution?, codec? })
                    → { success, filePath, duration } | { success: false, error }

video:ffmpeg-available ()
                    → { available: boolean, path: string | null }
```

### Preload Bridge Additions

```js
// Artifacts
saveArtifact: (agentId, executionId, nodeId, nodeType, filename, buffer, mimeType, metadata) =>
  ipcRenderer.invoke('artifact:save', ...),
listArtifacts: (filters) => ipcRenderer.invoke('artifact:list', filters),
openArtifact: (artifactId) => ipcRenderer.invoke('artifact:open', artifactId),
deleteArtifact: (artifactId) => ipcRenderer.invoke('artifact:delete', artifactId),
getArtifactDir: () => ipcRenderer.invoke('artifact:get-dir'),
exportArtifact: (artifactId, destPath) => ipcRenderer.invoke('artifact:export', artifactId, destPath),

// Email
sendEmail: (message) => ipcRenderer.invoke('email:send', message),
testEmailConnection: () => ipcRenderer.invoke('email:test'),

// Video
composeVideo: (config) => ipcRenderer.invoke('video:compose', config),
checkFfmpeg: () => ipcRenderer.invoke('video:ffmpeg-available'),

// Push events
onArtifactCreated: (callback) => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on('artifact:created', handler);
  return () => ipcRenderer.removeListener('artifact:created', handler);
},
```

---

## 4. Agent Engine Changes

### New Node Executors in agent-engine.js

The `_executeNode` switch statement gets 5 new cases:

**`_execEmail(nodeData, nodeInput, credentials, context)`**
1. Resolve `to`, `subject`, `body` from nodeData (with `{{input}}` interpolation)
2. Collect attachments from upstream artifact references in context
3. Build nodemailer transporter from stored SMTP credentials
4. Send email
5. Return `{ sent: true, messageId, to, subject }`

**`_execPDF(nodeData, nodeInput, agentId, executionId)`**
1. Take upstream text/HTML content
2. If HTML: render in hidden BrowserWindow, call `webContents.printToPDF()`
3. If plain text: use pdfkit to create formatted PDF
4. Save to `artifacts/{agentId}/{executionId}/{filename}.pdf`
5. Register artifact metadata via IPC
6. Return `{ artifactId, filePath, type: 'pdf' }`

**`_execDocx(nodeData, nodeInput, agentId, executionId)`**
1. Take upstream text/markdown
2. Parse into paragraphs, headings, lists
3. Build DOCX using `docx` package
4. Save to artifacts directory
5. Register artifact, return reference

**`_execBlog(nodeData, nodeInput, agentId, executionId)`**
1. Take upstream markdown text
2. Convert to HTML using `marked`
3. Wrap in styled HTML template (chosen CSS theme)
4. Save `.html` file to artifacts directory
5. Register artifact, return reference

**`_execVideo(nodeData, nodeInput, agentId, executionId)`**
1. Resolve input images/audio from nodeData config or upstream references
2. Build ffmpeg command via `fluent-ffmpeg`
3. Compose video, save to artifacts directory
4. Register artifact, return reference

### Artifact Reference Passing

When an action node produces an artifact, its output stored in the execution context includes `{ __artifact: true, artifactId, filePath, type, mimeType }`. Downstream nodes (especially EmailNode) can detect these upstream artifact references and use them (e.g., as email attachments).

---

## 5. SMTP Settings UI

New section in `Settings.jsx` under a "Email / SMTP" tab:

| Field | Type | Storage Key |
|-------|------|-------------|
| SMTP Host | text input | `smtp-host` |
| SMTP Port | number input (default 587) | `smtp-port` |
| Use TLS | toggle switch | `smtp-secure` |
| Username | text input | `smtp-user` |
| Password | password input (encrypted) | `smtp-pass` |
| From Name | text input | `smtp-from-name` |
| From Email | text input | `smtp-from-email` |
| [Test Connection] | button | — |

All values stored via existing encrypted credential system.

---

## 6. Frontend Views

### Per-Agent Outputs Tab (AgentDetail.jsx)

- New tab alongside existing config/versions/metrics tabs
- Grid of artifact cards showing: icon by type, filename, date, size
- Click card: opens in OS default app
- Right-click / menu: open, export to folder, delete
- Filter dropdown by type (PDF, DOCX, HTML, Video)
- Empty state: "This agent hasn't produced any files yet"

### Global Media Library (new view: MediaLibrary.jsx)

- New sidebar entry with `FolderOpen` icon, positioned after Resource Library
- Top stats row: total artifacts count, total storage used, breakdown by type
- Filter bar: agent dropdown, type checkboxes, date range
- Search by filename
- Grid/list toggle
- Artifact cards with preview thumbnails
- Bulk select + delete
- "Open folder" button to reveal artifacts directory in file explorer

### NodeConfig Panel Updates

`NodeConfig.jsx` gets configuration forms for each new action node type:
- EmailNode: to/cc/bcc fields, subject, body template textarea, "attach upstream files" toggle
- PDFNode: filename, page size dropdown, margins
- DocxNode: filename, title, font settings
- BlogNode: filename, theme dropdown, title, meta
- VideoNode: filename, input config, fps, resolution

---

## 7. New Dependencies

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `nodemailer` | ^6.x | SMTP email sending | ~3MB |
| `pdfkit` | ^0.15.x | Programmatic PDF generation | ~8MB |
| `docx` | ^9.x | DOCX document generation | ~18MB |
| `marked` | ^15.x | Markdown to HTML conversion | ~500KB |
| `fluent-ffmpeg` | ^2.x | FFmpeg Node.js API | ~1MB |
| `ffmpeg-static` | ^5.x | Bundled FFmpeg binary | ~80MB |

Total: ~110MB additional (dominated by FFmpeg binary)

### electron-builder config additions

```json
{
  "extraResources": [
    {
      "from": "node_modules/ffmpeg-static/ffmpeg.exe",
      "to": "ffmpeg/ffmpeg.exe"
    }
  ]
}
```

---

## 8. Design System Updates

### New CSS Variable

```css
--node-action: #F43F5E;  /* Rose — Action nodes category */
```

### Node Panel Category

```
Actions (Rose)
├── EmailNode    — Mail icon
├── PDFNode      — FileText icon
├── DocxNode     — FileType icon
├── BlogNode     — Globe icon
└── VideoNode    — Video icon
```

---

## 9. Data Model Changes

### Agent config additions

No changes to agent schema. Action nodes are just flow nodes with their own `data` fields.

### Top-level state additions

```json
{
  "agents": [],
  "artifacts": [],    // NEW
  "resources": {},
  "providers": {},
  "executions": [],
  "settings": {}
}
```

### New Zustand Store: artifact-store.js

```js
{
  artifacts: [],
  loading: false,
  filters: { agentId: null, type: null },

  loadArtifacts: async (filters?) => ...,
  addArtifact: (artifact) => ...,
  deleteArtifact: async (artifactId) => ...,
  getAgentArtifacts: (agentId) => ...,
  getArtifactsByExecution: (executionId) => ...,
  getTotalStorageUsed: () => ...,
}
```

---

## 10. Push Events

```
artifact:created    { artifact }    — sent after any action node saves a file
email:sent          { messageId, to, subject }  — sent after email is dispatched
email:failed        { error, to, subject }      — sent if email fails
video:progress      { percent, fps }            — sent during video composition
```
