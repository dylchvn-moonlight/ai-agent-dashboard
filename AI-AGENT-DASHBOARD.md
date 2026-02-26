# AI Agent UI Dashboard — Product Blueprint & Build Guide

> **Version:** 0.5.0 | **Created:** 2026-02-24 | **Updated:** 2026-02-27
> **Single source of truth** for building, maintaining, and extending the AI Agent Dashboard.
> **Master guide:** [`PROJECT-FOUNDATION.md`](../../PROJECT-FOUNDATION.md) — covers all project types, plugins, and deployment.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture & Stack](#2-architecture--stack)
3. [Project Structure](#3-project-structure)
4. [Data Model](#4-data-model)
5. [Build Order — Phase by Phase](#5-build-order--phase-by-phase)
6. [Visual Agent Flow Editor](#6-visual-agent-flow-editor)
7. [Agent Execution Engine](#7-agent-execution-engine)
8. [Training & Feedback Loop](#8-training--feedback-loop)
9. [Deployment Packaging](#9-deployment-packaging)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Design System](#11-design-system)
12. [IPC Bridge Contract](#12-ipc-bridge-contract)
13. [Security](#13-security)
14. [Competitive Landscape & Inspiration](#14-competitive-landscape--inspiration)
15. [Changelog](#15-changelog)

---

## 1. Product Overview

### What It Is

An **AI Agent Builder Dashboard** — a desktop application where you visually design, train, test, monitor, and package AI agents for any workflow. Agents take user-defined inputs, scrape resources, call APIs/tools, process data through LLMs, and produce structured outputs.

### Core Principles

- **Visual-first** — every agent is a visible flow of nodes on a canvas
- **Train until right** — iterative feedback loop where you refine agents until output quality meets your standards
- **Ship to customers** — once an agent works, package it as an API endpoint, embeddable widget, or SDK for integration
- **Observe everything** — see token usage, costs, latency, errors, and execution traces in real time

### Key User Stories

1. **Build an agent**: Drag nodes onto a canvas → connect input → LLM → tools → output
2. **See the flow**: Visual map showing exactly how data moves through the agent
3. **Train iteratively**: Run test inputs, review outputs, rate quality, agent learns from feedback
4. **Monitor execution**: Watch agents run in real time with per-node I/O visibility
5. **Package for customers**: Export as API endpoint, chat widget, or installable SDK
6. **Manage fleet**: Dashboard of all agents with status, usage metrics, and health

### Views (Pages)

| View | Purpose |
|------|---------|
| **Dashboard** | Overview of all agents — cards with status, metrics, last run |
| **Agent Builder** | React Flow canvas — visual node editor for designing agent flows |
| **Agent Detail** | Single agent view — config, versions, test runs, metrics |
| **Training Studio** | Test inputs, review outputs, rate quality, track improvement |
| **Execution Monitor** | Real-time execution view with per-node I/O and trace replay |
| **Deployment Center** | Package agents for customers — API keys, widgets, SDK configs |
| **Resource Library** | Saved tools, prompts, scrapers, and reusable components |
| **Media Library** | Browse, filter, and open all agent-produced artifacts (PDFs, docs, videos, blogs) |
| **Settings** | API keys, LLM providers, SMTP email config, default configs, themes |

---

## 2. Architecture & Stack

### Chosen Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Desktop Shell** | Electron 28 | Native OS access, file system, consistent with our other apps |
| **Frontend** | React 18 + Vite 5 | Fast dev, hot reload, component model |
| **Visual Editor** | React Flow (xyflow) | Industry standard for node-based UIs (used by Dify, LangFlow, Flowise) |
| **State Management** | Zustand | More capable than Context for complex state (flows, execution, history) |
| **Styling** | TailwindCSS 3 + PostCSS + shadcn/ui | Utility classes + accessible components (v3 for Node 18 compat) |
| **Icons** | Lucide React | Consistent, tree-shakeable |
| **Toasts** | Sonner | Clean notifications |
| **Charts** | Recharts | Agent metrics, usage charts |
| **Command Palette** | cmdk | Keyboard-first navigation |
| **Agent Execution** | Node.js (Electron main process) | Runs agents, manages LLM calls, tool execution |
| **LLM Integration** | Anthropic SDK + OpenAI/Kimi/MiniMax REST | Multi-provider support (5 providers) |
| **Onboarding** | react-joyride | Guided tour for new users |
| **Updates** | electron-updater | In-app update system |
| **Build** | electron-builder | Windows NSIS installer |

### Why This Stack

- **React Flow** is the de facto standard — Dify (58K stars), LangFlow (42K stars), Flowise (30K stars) all use it
- **Zustand** over Context because agent flows have complex nested state with undo/redo needs
- **Electron** for desktop because agents need file system access, local execution, and credential storage
- **Multi-provider LLM** support because customers may want Claude, GPT, or open-source models

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      RENDERER (React)                        │
│                                                              │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────┐ │
│  │Dashboard │ │Agent Builder │ │ Training  │ │ Deploy    │ │
│  │ (cards)  │ │(React Flow)  │ │ Studio    │ │ Center    │ │
│  └──────────┘ └──────────────┘ └───────────┘ └───────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                   Zustand Store                          ││
│  │  agents[], flows{}, executions[], training[], settings   ││
│  └──────────────────────────────────────────────────────────┘│
│                          │ window.electronAPI                 │
├──────────────────────────┼──────────────────────────────────┤
│                   PRELOAD BRIDGE                             │
├──────────────────────────┼──────────────────────────────────┤
│                  MAIN PROCESS (Node.js)                      │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │Agent Engine│ │ LLM Router │ │Tool Runner │ │ Packager │ │
│  │(execute    │ │(Claude,GPT,│ │(scrape,API,│ │(API,SDK, │ │
│  │ flows)     │ │Kimi,MiniMax│ │ code,file) │ │ widget)  │ │
│  │            │ │ local)     │ │            │ │          │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │Data Store  │ │Training    │ │ Metrics    │ │ Auto     ││
│  │(JSON files)│ │Engine      │ │ Collector  │ │ Updater  ││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
ai-agent-ui/
├── main.js                     # Electron main process — window, IPC, lifecycle, updates
├── preload.js                  # Secure bridge — electronAPI (multi-key, models, updates, artifacts, email)
├── agent-engine.js             # Core agent execution engine (18 node types incl. action nodes)
├── llm-router.js               # Multi-provider LLM calls (Claude, GPT, Kimi, MiniMax, local)
├── artifact-manager.js         # Artifact storage — save/list/open/delete agent-produced files
├── tool-runner.js              # Tool execution (scraping, APIs, code, files)
├── training-engine.js          # Training loop, feedback processing, evaluation
├── deployment-packager.js      # Package agents as API/widget/SDK
├── metrics-collector.js        # Token usage, latency, cost tracking
├── package.json
├── vite.config.mjs
├── index.html
│
├── src/                        # React frontend (renderer)
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main shell — sidebar + content + routing
│   │
│   ├── stores/                 # Zustand stores (split by domain)
│   │   ├── agent-store.js      # Agents CRUD, active agent
│   │   ├── artifact-store.js   # Artifact CRUD, filters, storage stats
│   │   ├── flow-store.js       # React Flow state (nodes, edges, viewport)
│   │   ├── execution-store.js  # Running executions, logs, traces
│   │   ├── training-store.js   # Training sessions, feedback, evaluations
│   │   └── ui-store.js         # Theme, navigation, modals, command palette
│   │
│   ├── views/
│   │   ├── Dashboard.jsx       # Agent cards grid with metrics
│   │   ├── AgentBuilder.jsx    # React Flow canvas + node panel + config
│   │   ├── AgentDetail.jsx     # Single agent — tabs: config, versions, metrics
│   │   ├── TrainingStudio.jsx  # Test/train agents — input → output → rate
│   │   ├── ExecutionMonitor.jsx# Real-time execution traces
│   │   ├── DeploymentCenter.jsx# Package and deploy agents
│   │   ├── ResourceLibrary.jsx # Saved tools, prompts, scrapers
│   │   ├── MediaLibrary.jsx    # Global artifact browser — filter by type, agent, search
│   │   ├── Settings.jsx        # API keys, providers, SMTP email, preferences
│   │   └── Modals.jsx          # All modal forms
│   │
│   ├── nodes/                  # Custom React Flow node types
│   │   ├── InputNode.jsx       # User input / trigger
│   │   ├── LLMNode.jsx         # LLM call (Claude, GPT, etc.)
│   │   ├── ToolNode.jsx        # Tool execution (API, scrape, code)
│   │   ├── ScraperNode.jsx     # Web scraping node
│   │   ├── ConditionNode.jsx   # If/else branching
│   │   ├── LoopNode.jsx        # Iteration / retry
│   │   ├── MemoryNode.jsx      # Context / conversation memory
│   │   ├── OutputNode.jsx      # Final output / response
│   │   ├── CodeNode.jsx        # Inline JS/Python execution
│   │   ├── HTTPNode.jsx        # External API calls
│   │   ├── RouterNode.jsx      # Route to different paths based on input
│   │   ├── TransformNode.jsx   # Data transformation / mapping
│   │   ├── SubAgentNode.jsx    # Call another agent as a sub-flow
│   │   ├── EmailNode.jsx       # Send email via SMTP (action node)
│   │   ├── PDFNode.jsx         # Generate PDF document (action node)
│   │   ├── DocxNode.jsx        # Generate Word document (action node)
│   │   ├── BlogNode.jsx        # Render markdown to styled HTML (action node)
│   │   └── VideoNode.jsx       # Compose video from media (action node)
│   │
│   ├── components/
│   │   ├── Sidebar.jsx         # Navigation sidebar (data-tour attrs)
│   │   ├── NodePanel.jsx       # Draggable node palette
│   │   ├── NodeConfig.jsx      # Right panel — configure selected node
│   │   ├── ExecutionTrace.jsx  # Step-by-step execution visualization
│   │   ├── MetricsCard.jsx     # Reusable metrics display
│   │   ├── AgentCard.jsx       # Agent card for dashboard grid
│   │   ├── TrainingRun.jsx     # Single training run result
│   │   ├── FlowMinimap.jsx     # Minimap for large flows
│   │   ├── WelcomeModal.jsx    # First-time onboarding slides (4 steps)
│   │   ├── GuidedTour.jsx      # react-joyride guided tour wrapper
│   │   ├── UpdateNotification.jsx # Floating update-available toast
│   │   └── ui/                 # shadcn/ui components
│   │
│   ├── lib/
│   │   ├── utils.js            # cn(), uid(), formatters
│   │   ├── node-types.js       # Node type registry + defaults
│   │   └── flow-utils.js       # Flow serialization, validation
│   │
│   ├── styles/
│   │   ├── fonts.css
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── tailwind.css
│   │   └── react-flow.css      # Custom React Flow styling
│   │
│   └── assets/
│       └── fonts/              # Inter woff2 (bundled)
│
├── updates/
│   └── update-config.json      # Auto-update feed config (provider, url, channel)
├── build/
│   └── icon.ico
├── dev.bat
└── build-installer.bat
```

---

## 4. Data Model

### Agent

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "icon": "string (lucide icon name)",
  "color": "#hex",
  "status": "draft | active | training | deployed | archived",
  "version": "string (semver)",
  "versions": [{
    "version": "string",
    "flow": { "nodes": [], "edges": [] },
    "createdAt": "ISO datetime",
    "notes": "string"
  }],
  "flow": {
    "nodes": [{ "id", "type", "position": { "x", "y" }, "data": {} }],
    "edges": [{ "id", "source", "target", "sourceHandle", "targetHandle" }]
  },
  "config": {
    "defaultProvider": "claude | openai | local",
    "defaultModel": "string",
    "maxTokens": 4096,
    "temperature": 0.7,
    "maxRetries": 3,
    "timeout": 30000
  },
  "training": {
    "totalRuns": 0,
    "avgScore": 0,
    "lastTrainedAt": "ISO datetime | null",
    "feedbackHistory": [{
      "id": "string",
      "input": {},
      "expectedOutput": "string | null",
      "actualOutput": "string",
      "score": 0-5,
      "feedback": "string",
      "timestamp": "ISO datetime"
    }]
  },
  "deployment": {
    "status": "not_deployed | api | widget | sdk",
    "apiKey": "string | null",
    "endpoint": "string | null",
    "widgetConfig": {} | null,
    "deployedAt": "ISO datetime | null"
  },
  "metrics": {
    "totalExecutions": 0,
    "avgLatency": 0,
    "totalTokens": 0,
    "totalCost": 0,
    "errorRate": 0,
    "lastExecutedAt": "ISO datetime | null"
  },
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### Node Data (per node type)

```json
{
  "InputNode": {
    "label": "User Input",
    "inputType": "text | json | file | webhook",
    "schema": {} | null,
    "description": "string"
  },
  "LLMNode": {
    "label": "LLM Call",
    "provider": "claude | openai | kimi | minimax | local",
    "model": "string",
    "systemPrompt": "string",
    "temperature": 0.7,
    "maxTokens": 4096,
    "tools": ["toolId1", "toolId2"]
  },
  "ToolNode": {
    "label": "Tool Name",
    "toolType": "api | scraper | code | file | database",
    "config": {}
  },
  "ScraperNode": {
    "label": "Web Scraper",
    "url": "string (or dynamic from input)",
    "selector": "string | null",
    "format": "text | html | json | markdown",
    "pagination": false
  },
  "ConditionNode": {
    "label": "Condition",
    "conditions": [{ "field": "string", "operator": "eq | neq | contains | gt | lt", "value": "any" }],
    "trueLabel": "Yes",
    "falseLabel": "No"
  },
  "LoopNode": {
    "label": "Loop",
    "maxIterations": 10,
    "stopCondition": "string (expression)"
  },
  "MemoryNode": {
    "label": "Memory",
    "memoryType": "buffer | vector | long_term",
    "maxMessages": 20,
    "vectorStore": "string | null"
  },
  "OutputNode": {
    "label": "Output",
    "outputFormat": "text | json | markdown | html",
    "schema": {} | null
  },
  "CodeNode": {
    "label": "Code",
    "language": "javascript | python",
    "code": "string",
    "inputs": ["varName1"],
    "outputs": ["varName1"]
  },
  "HTTPNode": {
    "label": "HTTP Request",
    "method": "GET | POST | PUT | DELETE",
    "url": "string",
    "headers": {},
    "body": {} | null,
    "auth": { "type": "none | bearer | basic", "token": "string" }
  },
  "RouterNode": {
    "label": "Router",
    "routes": [{ "label": "string", "condition": "string" }]
  },
  "TransformNode": {
    "label": "Transform",
    "transformType": "map | filter | reduce | template",
    "expression": "string"
  },
  "SubAgentNode": {
    "label": "Sub-Agent",
    "agentId": "string",
    "inputMapping": {},
    "outputMapping": {}
  },
  "EmailNode": {
    "label": "Send Email",
    "to": "string",
    "cc": "string",
    "bcc": "string",
    "subject": "string",
    "bodyTemplate": "{{input}}",
    "attachFromUpstream": false
  },
  "PDFNode": {
    "label": "Generate PDF",
    "filenameTemplate": "output-{{date}}",
    "pageSize": "A4 | Letter | Legal",
    "margins": { "top": 40, "bottom": 40, "left": 40, "right": 40 },
    "includeHeader": false,
    "headerText": "string",
    "includeFooter": false,
    "footerText": "string"
  },
  "DocxNode": {
    "label": "Generate DOCX",
    "filenameTemplate": "document-{{date}}",
    "documentTitle": "string",
    "fontSize": 12,
    "fontFamily": "Arial | Times New Roman | Calibri | Courier New"
  },
  "BlogNode": {
    "label": "Generate Blog",
    "filenameTemplate": "blog-{{date}}",
    "cssTheme": "minimal | modern | newspaper",
    "pageTitle": "string",
    "metaDescription": "string",
    "includeTableOfContents": false
  },
  "VideoNode": {
    "label": "Create Video",
    "filenameTemplate": "video-{{date}}",
    "inputType": "single_image_with_audio | images_dir | image_list",
    "audioSource": "string (file path)",
    "fps": 30,
    "resolution": "1920x1080 | 1280x720 | 3840x2160 | 1080x1920",
    "codec": "libx264 | libx265 | libvpx-vp9"
  }
}
```

### Execution Trace

```json
{
  "id": "string",
  "agentId": "string",
  "status": "running | completed | failed | cancelled",
  "input": {},
  "output": {} | null,
  "startedAt": "ISO datetime",
  "completedAt": "ISO datetime | null",
  "totalTokens": 0,
  "totalCost": 0,
  "latencyMs": 0,
  "steps": [{
    "nodeId": "string",
    "nodeType": "string",
    "status": "pending | running | completed | failed | skipped",
    "input": {},
    "output": {} | null,
    "startedAt": "ISO datetime",
    "completedAt": "ISO datetime | null",
    "tokens": 0,
    "cost": 0,
    "error": "string | null"
  }]
}
```

### App State (top-level)

```json
{
  "agents": [],
  "resources": {
    "tools": [],
    "prompts": [],
    "scrapers": []
  },
  "providers": {
    "claude": { "apiKey": "encrypted", "defaultModel": "claude-sonnet-4-6" },
    "openai": { "apiKey": "encrypted", "defaultModel": "gpt-4o" },
    "kimi": { "apiKey": "encrypted", "defaultModel": "moonshot-v1-128k" },
    "minimax": { "apiKey": "encrypted", "defaultModel": "MiniMax-M2.5" }
  },
  "executions": [],
  "trainingHistory": [],
  "settings": {
    "theme": "dark",
    "accentColor": "#3B82F6",
    "autoSave": true,
    "defaultProvider": "claude"
  }
}
```

---

## 5. Build Order — Phase by Phase

### Phase 1: Foundation (Scaffold + Data)
**Goal:** App launches, loads/saves data, navigation works.

1. Initialize: Electron + Vite + React + Tailwind + shadcn/ui
2. Create main.js — BrowserWindow, IPC for data:load / data:save
3. Create preload.js — secure bridge
4. Set up Zustand stores (agent-store, ui-store)
5. Build App.jsx shell — sidebar + main content area + routing
6. Build Settings.jsx — API key input (encrypted storage)
7. Verify: app launches, data persists, theme toggle works

### Phase 2: Agent Builder (Visual Flow Editor)
**Goal:** Create and edit agents visually on a React Flow canvas.

1. Install and configure React Flow (xyflow)
2. Build NodePanel.jsx — draggable node palette (left sidebar)
3. Build custom node components (InputNode, LLMNode, ToolNode, OutputNode)
4. Build AgentBuilder.jsx — canvas + node panel + config panel
5. Build NodeConfig.jsx — right panel to configure selected node
6. Implement flow serialization (save/load as JSON)
7. Build FlowMinimap for large flows
8. Implement undo/redo (zustand middleware)
9. Verify: create a flow, save it, reload, flow persists

### Phase 3: Agent Execution
**Goal:** Run an agent flow end-to-end and see results.

1. Build agent-engine.js — traverse flow DAG, execute nodes in order
2. Build llm-router.js — route LLM calls to Claude/GPT based on node config
3. Build tool-runner.js — execute tools (HTTP, scraper, code)
4. Build ExecutionTrace.jsx — real-time step visualization
5. Wire up execution to React Flow — highlight active nodes during execution
6. Build ExecutionMonitor.jsx — list of runs with trace replay
7. Verify: create agent with Input → LLM → Output, run it, see trace

### Phase 4: Training & Feedback
**Goal:** Iteratively improve agents through testing and feedback.

1. Build TrainingStudio.jsx — input form, run agent, show output, rate quality
2. Build training-engine.js — collect feedback, adjust prompts, track scores
3. Implement auto-prompt refinement (use LLM to improve system prompts based on feedback)
4. Build training metrics (score over time, common failure patterns)
5. Build A/B testing — compare two versions side by side
6. Verify: run 10 test inputs, rate outputs, see quality improve

### Phase 5: Dashboard & Monitoring
**Goal:** Overview of all agents with metrics and health.

1. Build Dashboard.jsx — agent cards grid with status, metrics
2. Build AgentCard.jsx — status badge, last run, token usage, cost
3. Build AgentDetail.jsx — single agent deep-dive (config, versions, metrics)
4. Build metrics-collector.js — aggregate token usage, costs, latencies
5. Build MetricsCard.jsx + charts (Recharts)
6. Verify: dashboard shows all agents, clicking opens detail

### Phase 6: Deployment Packaging
**Goal:** Package agents for customer use.

1. Build deployment-packager.js — generate API server, widget code, SDK
2. Build DeploymentCenter.jsx — configure deployment, generate keys
3. API packaging: Express server with the agent flow embedded
4. Widget packaging: Embeddable chat widget (HTML + JS + CSS)
5. SDK packaging: npm package wrapping agent API calls
6. Build export (Docker, standalone, cloud-ready)
7. Verify: deploy agent as API, call it, get response

### Phase 7: Polish & Ship
1. Command palette (Ctrl+K) — search agents, nodes, actions
2. Resource Library — saved tools, prompts, scrapers
3. Agent versioning — save snapshots, rollback
4. Import/export agents as JSON
5. Build installer (electron-builder)
6. Test on clean machine

---

## 6. Visual Agent Flow Editor

### React Flow Setup

```javascript
import { ReactFlow, Background, Controls, MiniMap, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

### Node Categories

| Category | Node Types | Color |
|----------|-----------|-------|
| **Input/Output** | InputNode, OutputNode | Blue `#3B82F6` |
| **AI/LLM** | LLMNode, MemoryNode | Purple `#A78BFA` |
| **Tools** | ToolNode, ScraperNode, HTTPNode, CodeNode | Green `#22C55E` |
| **Control Flow** | ConditionNode, LoopNode, RouterNode | Amber `#F59E0B` |
| **Data** | TransformNode, SubAgentNode | Cyan `#06B6D4` |
| **Actions** | EmailNode, PDFNode, DocxNode, BlogNode, VideoNode | Rose `#F43F5E` |

### Node Component Pattern

Each custom node follows this structure:

```jsx
import { Handle, Position } from '@xyflow/react';

export default function LLMNode({ data, selected }) {
  return (
    <div className={`node-card ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header" style={{ borderColor: '#A78BFA' }}>
        <BrainIcon size={14} />
        <span>{data.label || 'LLM Call'}</span>
      </div>
      <div className="node-body">
        <div className="node-field">{data.model || 'claude-sonnet-4-6'}</div>
        <div className="node-preview">{data.systemPrompt?.slice(0, 60)}...</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

### Key UX Patterns (from research)

- **Dify's Relationships Panel**: Shift+click a node to highlight its connections, fade everything else
- **Rivet's real-time I/O**: Show input/output data on each node during execution
- **Flowise's progressive complexity**: Simple mode (linear flow) vs advanced mode (full DAG)
- **Auto-layout**: Use ELK.js or Dagre for automatic node arrangement
- **Connection validation**: Only allow valid connections (output types must match input types)

---

## 7. Agent Execution Engine

### Execution Flow

```
1. Parse flow JSON → build directed graph
2. Topological sort → determine execution order
3. For each node in order:
   a. Resolve inputs (from connected upstream nodes)
   b. Execute node (LLM call, tool run, condition check)
   c. Store outputs
   d. Push execution step to renderer (real-time visualization)
4. Collect final output from OutputNode(s)
5. Record execution trace (all steps, timing, tokens, costs)
```

### Node Execution Pattern

```javascript
async function executeNode(node, inputs, context) {
  const startTime = Date.now();
  let result;

  switch (node.type) {
    case 'LLMNode':
      result = await llmRouter.call(node.data, inputs, context);
      break;
    case 'ToolNode':
      result = await toolRunner.execute(node.data, inputs);
      break;
    case 'ConditionNode':
      result = evaluateCondition(node.data, inputs);
      break;
    case 'CodeNode':
      result = await executeCode(node.data, inputs);
      break;
    // ... etc
  }

  return {
    output: result,
    latencyMs: Date.now() - startTime,
    tokens: result.tokens || 0,
    cost: result.cost || 0,
  };
}
```

### LLM Router

Multi-provider routing based on node configuration:

```javascript
async function callLLM(config, inputs, context) {
  switch (config.provider) {
    case 'claude':  return await callClaude(config, inputs, context);
    case 'openai':  return await callOpenAI(config, inputs, context);
    case 'kimi':    return await callKimi(config, inputs, context);
    case 'minimax': return await callMiniMax(config, inputs, context);
    case 'local':   return await callLocal(config, inputs, context);
  }
}
```

### Provider API Details

| Provider | API Endpoint | Auth | Temp Range | Token Param |
|----------|-------------|------|------------|-------------|
| **Claude** | Anthropic SDK | `apiKey` | 0–1 | `max_tokens` |
| **OpenAI** | `api.openai.com/v1/chat/completions` | Bearer | 0–2 | `max_tokens` |
| **Kimi** | `api.moonshot.ai/v1/chat/completions` | Bearer | 0–1 | `max_tokens` |
| **MiniMax** | `api.minimax.io/v1/chat/completions` | Bearer | 0–2 | `max_completion_tokens` |
| **Local** | User-configured URL | None | 0–2 | `max_tokens` |

---

## 8. Training & Feedback Loop

### Training Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Test     │────▶│  Agent   │────▶│  Review  │────▶│  Refine  │
│  Input    │     │  Execute │     │  Output  │     │  Agent   │
└──────────┘     └──────────┘     │  + Rate  │     └────┬─────┘
                                  └──────────┘          │
                                       │                │
                                       ▼                │
                                  ┌──────────┐          │
                                  │ Feedback │◀─────────┘
                                  │ Database │
                                  └──────────┘
```

### Training Modes

1. **Manual Testing**: User provides input, reviews output, rates 1-5, adds feedback
2. **Batch Testing**: Upload a CSV/JSON of test cases with expected outputs, auto-score
3. **A/B Comparison**: Run same input through two agent versions, pick the winner
4. **Auto-Refinement**: Use an LLM to analyze feedback patterns and suggest prompt improvements

### Feedback-Driven Improvement

```javascript
async function autoRefine(agent, feedbackHistory) {
  // Collect low-scoring runs
  const failures = feedbackHistory.filter(f => f.score <= 2);

  // Ask LLM to analyze patterns and suggest improvements
  const analysis = await llmRouter.call({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    systemPrompt: 'You are an AI agent optimizer. Analyze these failure cases and suggest specific improvements to the system prompt.',
    messages: [{ role: 'user', content: JSON.stringify(failures) }]
  });

  // Return suggested improvements for user review
  return analysis;
}
```

### Training Metrics

| Metric | What It Measures |
|--------|-----------------|
| **Avg Score** | Mean quality rating across all test runs |
| **Score Trend** | Score improvement over time (chart) |
| **Failure Rate** | % of runs scoring ≤ 2 |
| **Common Failures** | Categorized failure patterns |
| **Token Efficiency** | Tokens per successful output |

---

## 9. Deployment Packaging

### Deployment Options

| Option | What Customer Gets | Best For |
|--------|-------------------|----------|
| **API Endpoint** | REST API URL + API key | Backend integration |
| **Chat Widget** | HTML embed code (script tag) | Websites, apps |
| **SDK Package** | npm/pip package | Developer integration |
| **Docker Container** | Dockerfile + docker-compose | Self-hosting |
| **Standalone Server** | Express.js server with agent embedded | Simple deployment |

### API Endpoint Package

Generates a standalone Express.js server:

```javascript
// Generated: agent-server.js
const express = require('express');
const app = express();
app.use(express.json());

// Embedded agent flow
const AGENT_FLOW = { /* serialized flow JSON */ };

app.post('/api/run', async (req, res) => {
  const { input, apiKey } = req.body;
  // Validate API key
  // Execute agent flow
  // Return output
  res.json({ output, trace, metrics });
});

app.listen(3000);
```

### Chat Widget Package

Generates embeddable HTML + JS:

```html
<!-- Generated: agent-widget.html -->
<script src="https://your-server.com/widget.js"
  data-agent-id="xxx"
  data-api-key="xxx"
  data-theme="dark"
  data-position="bottom-right">
</script>
```

---

## 10. Monitoring & Observability

### Metrics Tracked Per Execution

| Metric | Source |
|--------|--------|
| Total tokens (input + output) | LLM provider response |
| Cost (USD) | Calculated from token counts + model pricing |
| Latency (total + per-node) | Timestamps |
| Error rate | Failed executions / total |
| Success rate | Score ≥ 4 / total |

### Real-Time Execution View

During execution, the React Flow canvas shows:
- **Active node**: Glowing border + spinner
- **Completed node**: Green checkmark + I/O data visible
- **Failed node**: Red border + error message
- **Pending node**: Dimmed
- **Data flow**: Animated edges showing data moving between nodes

### Dashboard Metrics

| Card | Shows |
|------|-------|
| Total Agents | Count by status (active, training, deployed) |
| Total Executions | Today / week / month |
| Total Cost | USD spent on LLM calls |
| Avg Latency | Response time across all agents |
| Error Rate | % of failed runs |
| Top Agents | Most used agents with metrics |

---

## 11. Design System

### Theme (Dark Default — Consistent with Command Centre)

```css
:root {
  --bg: #0B0F1A;
  --sf: #111827;
  --bd: #1E293B;
  --tx: #E2E8F0;
  --sb: #94A3B8;
  --dm: #64748B;
  --glass: rgba(17,24,39,0.7);
  --glassBd: rgba(255,255,255,0.06);

  /* Node category colors */
  --node-io: #3B82F6;
  --node-ai: #A78BFA;
  --node-tool: #22C55E;
  --node-flow: #F59E0B;
  --node-data: #06B6D4;
  --node-action: #F43F5E;

  /* Status colors */
  --status-active: #22C55E;
  --status-training: #F59E0B;
  --status-deployed: #3B82F6;
  --status-draft: #64748B;
  --status-error: #EF4444;
}
```

### Layout

- **Sidebar**: 60px collapsed (icon-only) / 240px expanded
- **Agent Builder**: Full-width canvas with left node panel (240px) + right config panel (320px)
- **Dashboard**: Grid of agent cards `repeat(auto-fill, minmax(300px, 1fr))`

### Node Styling

```css
.node-card {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glassBd);
  border-radius: 10px;
  min-width: 200px;
  font-size: 12px;
}
.node-card.selected {
  border-color: var(--node-category-color);
  box-shadow: 0 0 12px var(--node-category-color)40;
}
.node-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--glassBd);
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.node-body {
  padding: 8px 12px;
}
```

---

## 12. IPC Bridge Contract

```
DATA PERSISTENCE
  data:load              () → object | null
  data:save              (data) → boolean
  settings:load          () → object | null
  settings:save          (settings) → boolean

CREDENTIALS (encrypted, single key)
  credentials:save       (key, value) → boolean
  credentials:load       (key) → string | null

MULTI-KEY CREDENTIALS (v0.3.0)
  credentials:load-all-keys   (provider) → [{ id, label, masked, addedAt, isActive }]
  credentials:add-key         (provider, label, key) → { success, id }
  credentials:delete-key      (provider, keyId) → { success }
  credentials:set-active-key  (provider, keyId) → { success }

DYNAMIC MODELS (v0.3.0)
  models:fetch           (provider) → { success, models[] } | { success: false, error }
    claude  → hardcoded: [claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6]
    minimax → hardcoded: [MiniMax-M2.5, MiniMax-M1]
    openai  → fetched from api.openai.com/v1/models (filtered for chat models)
    kimi    → fetched from api.moonshot.ai/v1/models
    local   → empty (user enters manually)

AGENT MANAGEMENT
  agent:create           (agent) → agent
  agent:update           (id, updates) → agent
  agent:delete           (id) → boolean
  agent:export           (id) → { json, filename }
  agent:import           (json) → agent

AGENT EXECUTION
  agent:execute          (agentId, input) → executionId
  agent:cancel           (executionId) → boolean
  execution:status       (executionId) → ExecutionTrace

TRAINING
  training:run           (agentId, input, expectedOutput?) → TrainingResult
  training:rate          (trainingId, score, feedback) → boolean
  training:autoRefine    (agentId) → suggestions[]

LLM
  llm:call               (provider, model, messages, config) → response
  llm:models             (provider) → model[]
  llm:test               (provider, apiKey) → boolean

TOOLS
  tool:scrape            (url, config) → content
  tool:http              (method, url, headers, body) → response
  tool:code              (language, code, inputs) → output

DEPLOYMENT
  deploy:api             (agentId, config) → { endpoint, apiKey }
  deploy:widget          (agentId, config) → { embedCode }
  deploy:export          (agentId, format) → { filePath }

IN-APP UPDATES (v0.3.0)
  updates:check          () → { success, result }
  updates:download       () → { success }
  updates:install        () → quits and installs

ARTIFACTS (v0.4.0)
  artifact:save            (params) → { success, artifact }
  artifact:list            (filters?) → artifact[]
  artifact:open            (artifactId) → { success }
  artifact:delete          (artifactId) → { success }
  artifact:get-dir         () → string (path)
  artifact:open-folder     () → { success }

EMAIL (v0.4.0)
  email:send               (message) → { success, messageId }
  email:test               () → { success } | { success: false, error }

MINIMAX OAUTH
  minimax-oauth:start      (params) → { success, expiresAt }
  minimax-oauth:refresh    () → { success, expiresAt }
  minimax-oauth:status     () → { connected, expired, expiresAt, hasRefreshToken }
  minimax-oauth:disconnect () → { success }

PUSH EVENTS (main → renderer)
  execution:step         { executionId, step }
  execution:complete     { executionId, result }
  execution:error        { executionId, error }
  artifact:created       { artifact }
  training:update        { agentId, metrics }
  update:update-available      { version, ... }
  update:update-not-available  {}
  update:download-progress     { percent, ... }
  update:update-downloaded     {}
  update:error                 { message }
```

---

## 13. Security

### Credentials
- All API keys encrypted with Electron `safeStorage`
- Keys stored in `%APPDATA%/ai-agent-ui/credentials.json` (encrypted)
- Multi-key support: `{provider}-api-key` (active, string) + `{provider}-api-keys` (all, encrypted JSON array)
- Each key entry: `{ id, label, key, addedAt }` — displayed as masked cards in Settings
- Never log API keys or tokens
- Never send credentials through IPC in plaintext

### Agent Execution
- Code nodes run in sandboxed VM (vm2 or isolated-vm)
- HTTP requests respect rate limits
- Scraping respects robots.txt
- User approval required before executing agents with write permissions

### Electron
- contextIsolation: true
- nodeIntegration: false
- Preload bridge: specific named methods only

---

## 14. Competitive Landscape & Inspiration

### Platforms Researched

| Platform | Stars | Stack | Key Feature |
|----------|-------|-------|-------------|
| **Dify** | 58K | React Flow + Python | Relationships panel, parallel iteration |
| **LangFlow** | 42K | React Flow + Python | Tool mode toggle, MCP support |
| **Flowise** | 30K | React Flow + Node.js | 3-tier builder, embeddable widget |
| **n8n** | - | Vue.js + Node.js | Native evaluations, 400+ integrations |
| **Rivet** | - | TypeScript/Electron | Real-time node I/O, A/B testing |
| **AutoGen Studio** | - | React + Python | Mid-execution control, JSON/visual dual mode |
| **CrewAI** | - | Python | 4-type memory, role-based agents |
| **Sim Studio** | - | Next.js + React Flow | AI copilot, real-time collab |

### Features We're Taking From Each

- **Dify**: Shift+click to highlight connected nodes, parallel execution
- **Rivet**: Real-time I/O display on nodes during execution
- **n8n**: Native evaluation/testing framework built into the builder
- **Flowise**: Embeddable chat widget deployment
- **AutoGen Studio**: Pause/redirect during execution
- **CrewAI**: Multi-type memory system
- **Sim Studio**: AI copilot for node generation

---

## 15. Changelog

### v0.5.0 (2026-02-27) — n8n Integration & Agent Creator Config

**Agent Creator Config System**
- New `agentConfig` field on every agent: role, industry, business details, persona, guardrails, tools, knowledge sources, deployment channels
- `src/lib/agent-config.js` — Schema enums, defaults, validator
- `src/lib/industry-profiles.js` — 13 industry profiles (real_estate → custom) with terminology, FAQs, compliance rules
- `src/lib/role-templates.js` — 10 role templates (receptionist → review_manager) with goals, KPIs, default tools
- `src/lib/tool-mappings.js` — 15 tool→n8n node type mappings
- `src/lib/knowledge-sources.js` — 8 knowledge source types with config fields
- `src/lib/persona-presets.js` — 5 tone templates, default guardrails, smart defaults per industry+role combo
- `src/stores/agent-store.js` — Extended agent schema with full `agentConfig` nested structure

**Agent Config UI**
- `src/components/AgentConfigPanel.jsx` — 420px tabbed config panel (6 tabs: Industry & Role, Persona, Tools, Guardrails, Knowledge, Preview)
- "Configure" button in Agent Builder top bar with toggle state highlight
- Panel/NodeConfig are mutually exclusive (selecting a node closes config, opening config deselects nodes)
- Smart defaults: selecting industry+role auto-populates tools, tone, and knowledge sources
- `src/components/SystemPromptPreview.jsx` — Live system prompt preview with word/char count and copy button
- `src/components/AgentCard.jsx` — Industry/role badge tags on Dashboard agent cards (purple for industry, cyan for role)

**System Prompt Generator**
- `src/services/prompt-generator.js` — Generates complete system prompts from AgentConfig
- Sections: Identity, Goals, Communication Style, Business Info, Industry Knowledge, Tools, Knowledge Sources, Guardrails, Response Format
- Resolves string-or-object for industry/role lookups

**n8n Workflow Generator**
- `src/services/n8n-workflow-generator.js` — Converts AgentConfig → complete n8n workflow JSON
- 4 trigger types: chat, webhook, schedule, form
- AI Agent node + LLM sub-node + Memory sub-node + tool sub-nodes
- Connection types: main, ai_languageModel, ai_memory, ai_tool
- `validateWorkflow()` for pre-deployment checks

**n8n REST API Integration**
- `src/services/n8n-service.js` — Renderer-side API client (all calls proxy through IPC)
- `src/stores/n8n-store.js` — Zustand store for n8n state (workflows, credentials, connection status)
- `main.js` — 2 new IPC handlers: `n8n:request` (proxied API calls), `n8n:test-connection`
- `preload.js` — 2 new bridge methods: `n8nRequest`, `n8nTestConnection`
- Settings.jsx — "n8n Integration" section with API URL, API key, Save, Test Connection

**Terminal n8n Quick Actions**
- Collapsible n8n action bar in Terminal view with 6 quick commands
- Commands: List Workflows, List Credentials, List Executions, Health Check, Start n8n (Docker), n8n Logs
- Uses `$N8N_URL` and `$N8N_API_KEY` environment variables

**Kimi 2.5 Function Calling**
- `src/lib/kimi-tools.js` — 12 tool definitions for agent creation, prompt generation, n8n management
- `KIMI_AGENT_CREATOR_SYSTEM_PROMPT` — Master system prompt for Kimi-powered agent creation
- `llm-router.js` — Enhanced `_callKimi()` with `tools` and `tool_choice` support, returns `toolCalls` in result
- `agent-engine.js` — `_execLLM()` passes Kimi tools when `provider === 'kimi'` and `kimiTools` are configured

---

### v0.4.0 (2026-02-25) — Artifact & Action System

**5 Action Node Types**
- **EmailNode**: Send email via SMTP (nodemailer) with `{{input}}` template interpolation, CC/BCC, upstream artifact auto-attachment
- **PDFNode**: Generate PDF from markdown-like content (pdfkit) with configurable page size, header/footer, A4/Letter/Legal
- **DocxNode**: Generate Word documents (docx) with markdown parsing, bold/italic formatting, configurable font family/size
- **BlogNode**: Render markdown to styled HTML (marked@4.3.0) with 3 CSS themes (minimal, modern, newspaper) and optional TOC
- **VideoNode**: Compose video from image + audio (fluent-ffmpeg + ffmpeg-static) with configurable resolution, FPS, codec
- New "Actions" category in node palette — Rose `#F43F5E`

**Artifact Storage System**
- `artifact-manager.js`: Save/list/open/delete agent-produced files
- Files stored at `%APPDATA%/AIAgentDashboard/artifacts/{agentId}/{executionId}/`
- Metadata tracked in `data.json` artifacts array
- Filename templates: `{{date}}`, `{{time}}`, `{{timestamp}}` placeholders
- Artifact reference passing: action nodes output `{ __artifact: true, artifactId, filePath, type }` — downstream nodes detect and attach
- 6 new IPC handlers: `artifact:save`, `artifact:list`, `artifact:open`, `artifact:delete`, `artifact:get-dir`, `artifact:open-folder`
- `artifact:created` push event to renderer

**Email Integration**
- SMTP transport via nodemailer with encrypted credential storage (Electron safeStorage)
- SMTP Settings UI section in Settings.jsx (host, port, TLS, user, password, from name/email)
- "Test Connection" button with live status feedback
- 2 new IPC handlers: `email:send`, `email:test`

**Media Library View**
- New "Media Library" page accessible from sidebar
- Stats row: total artifacts, total storage, per-type breakdown
- Type filter buttons (All, PDF, DOCX, HTML, Video, Email) + filename search
- Artifact cards: click to open in OS default app, delete button
- "Open Folder" button to open artifacts directory in file explorer
- Real-time updates via `artifact:created` push event
- `artifact-store.js` Zustand store for frontend state

**Agent Engine Expansion**
- 5 new executors in agent-engine.js (18 total node types, up from 13)
- `executionId` parameter now passed through to executors for artifact tracking

**New Dependencies**
- `nodemailer` ^6.9.16 — SMTP email sending
- `pdfkit` ^0.16.0 — Programmatic PDF generation
- `docx` ^8.5.0 — Word document generation
- `marked` ^4.3.0 — Markdown to HTML (CJS-compatible, NOT v17+ which is ESM-only)
- `fluent-ffmpeg` ^2.1.3 — FFmpeg command builder
- `ffmpeg-static` ^5.2.0 — Bundled FFmpeg binary

---

### v0.3.0 (2026-02-25) — 5 Feature Update

**New Provider: Kimi (Moonshot AI)**
- Added as 5th LLM provider in `llm-router.js` (`_callKimi()`)
- OpenAI-compatible API at `api.moonshot.ai/v1/chat/completions`
- Temperature clamped 0.0–1.0, default model `moonshot-v1-128k`
- Added to NodeConfig.jsx provider dropdown and Settings provider list
- Fixed bug: `_callClaude` used `credentials.anthropicKey` (dot notation) — changed to `credentials['anthropic-api-key']` (bracket notation)

**Multi-Key Credential Management**
- Multiple API keys per provider (Claude, OpenAI, Kimi, MiniMax)
- Storage: `{provider}-api-key` (active) + `{provider}-api-keys` (encrypted JSON array)
- Settings UI: add key → input clears → key appears as masked removable card
- Active key switching via radio buttons, delete individual keys
- 4 new IPC handlers: `credentials:load-all-keys`, `credentials:add-key`, `credentials:delete-key`, `credentials:set-active-key`

**Dynamic Model Selection**
- Model dropdown replaces text input in Settings
- Hardcoded lists: Claude (3 models), MiniMax (2 models)
- API-fetched lists: OpenAI (`/v1/models`), Kimi (`/v1/models`)
- Refresh button, loading spinner, fallback to manual text input on failure
- Local provider remains manual entry

**Onboarding Tutorial**
- `WelcomeModal.jsx`: 4-slide Radix Dialog intro (Welcome, Build Visually, Connect Providers, Ready to Build)
- `GuidedTour.jsx`: react-joyride wrapper with 4 tour steps targeting `data-tour` attributes
- Dark glassmorphism themed tooltips matching app design
- Persisted via `settings.onboardingComplete`; "Re-run Tutorial" button in Settings > About

**In-App Update System**
- `electron-updater` integration in main.js with configurable feed URL
- `UpdateNotification.jsx`: floating toast when updates available (24h snooze via localStorage)
- Settings > Updates section: check, download progress bar, install & restart
- `updates/update-config.json`: safe defaults (empty URL = no-op until release server configured)

**Build Improvements**
- `predist` script added: `npx rimraf dist` — auto-cleans old installers before building
- `updates/**/*` added to electron-builder files list
- `publish` config added to build section

### v0.2.0 (2026-02-24)
- MiniMax provider + OAuth support
- Agent execution engine
- Full visual flow editor with 13 node types

### v0.1.0 (2026-02-24)
- Initial release: Electron + React + Vite scaffold
- Dashboard, Agent Builder, Settings
- Claude + OpenAI + Local LLM support
- Encrypted credential storage
- Dark glassmorphism theme

---

*This document is the single source of truth for the AI Agent UI Dashboard. Update it as the project evolves.*
