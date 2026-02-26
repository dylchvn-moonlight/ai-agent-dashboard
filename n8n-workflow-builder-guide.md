# n8n Workflow Builder — Complete Reference & Terminal Prompt Guide

> **For Dylan's AI Agent Dashboard — Command Terminal Integration**
> Build and deploy n8n workflows using natural language from your dashboard terminal.

> **Implementation Status:** IMPLEMENTED (v0.5.0, 2026-02-27)
> - n8n REST API service: `src/services/n8n-service.js`
> - n8n Zustand store: `src/stores/n8n-store.js`
> - IPC proxy handlers: `main.js` (`n8n:request`, `n8n:test-connection`)
> - IPC bridge: `preload.js` (`n8nRequest`, `n8nTestConnection`)
> - Settings UI: `src/views/Settings.jsx` (n8n Integration section)
> - Workflow generator: `src/services/n8n-workflow-generator.js`
> - Terminal quick actions: `src/views/Terminal.jsx` (n8n bar)

---

## Table of Contents

1. [n8n Architecture Overview](#1-n8n-architecture-overview)
2. [n8n REST API Reference](#2-n8n-rest-api-reference)
3. [Workflow JSON Schema — Complete Anatomy](#3-workflow-json-schema--complete-anatomy)
4. [Node Type Reference (Common Nodes)](#4-node-type-reference-common-nodes)
5. [Connection Schema Deep Dive](#5-connection-schema-deep-dive)
6. [Credential System](#6-credential-system)
7. [AI & LangChain Nodes](#7-ai--langchain-nodes)
8. [Workflow Templates Library (Your Agency Patterns)](#8-workflow-templates-library-your-agency-patterns)
9. [Validation & Error Handling](#9-validation--error-handling)
10. [Terminal System Prompt (Copy-Paste Ready)](#10-terminal-system-prompt-copy-paste-ready)

---

## 1. n8n Architecture Overview

n8n is a fair-code workflow automation platform with 400+ integrations. Workflows are stored as JSON and can be created, updated, activated, and executed entirely via its REST API — meaning your dashboard terminal agent can fully control n8n without ever touching the n8n UI.

### Key Concepts

- **Workflow**: A JSON object containing nodes, connections, settings, and metadata. Every workflow needs at least one trigger node.
- **Node**: A single unit of work (trigger, action, transformation). Each node has a `type`, `parameters`, `position`, and unique `name`.
- **Connection**: Defines data flow between nodes. Connections map outputs of one node to inputs of another.
- **Credential**: Stored authentication data (API keys, OAuth tokens) referenced by ID in workflows. Credentials are encrypted at rest.
- **Execution**: A single run of a workflow. Can be triggered manually, by schedule, by webhook, or by external event.

### Workflow Lifecycle

```
Create (inactive) → Configure nodes → Connect nodes → Activate → Executes on trigger → Deactivate/Update
```

---

## 2. n8n REST API Reference

### Base URL

```
# Self-hosted
http://your-n8n-host:5678/api/v1

# n8n Cloud
https://your-instance.app.n8n.cloud/api/v1
```

### Authentication

All API calls require the `X-N8N-API-KEY` header:

```bash
curl -H "X-N8N-API-KEY: your-api-key-here" \
     https://your-n8n-host:5678/api/v1/workflows
```

Generate your API key in n8n: **Settings → n8n API → Create API Key**

### Workflow Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workflows` | List all workflows |
| `GET` | `/workflows/{id}` | Get a specific workflow |
| `POST` | `/workflows` | **Create a new workflow** |
| `PATCH` | `/workflows/{id}` | Update an existing workflow |
| `DELETE` | `/workflows/{id}` | Delete a workflow |
| `POST` | `/workflows/{id}/activate` | Activate a workflow |
| `POST` | `/workflows/{id}/deactivate` | Deactivate a workflow |
| `POST` | `/workflows/{id}/run` | Execute a workflow manually |

### Execution Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/executions` | List executions |
| `GET` | `/executions/{id}` | Get execution details |
| `DELETE` | `/executions/{id}` | Delete an execution |

### Credential Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/credentials` | List all credentials |
| `POST` | `/credentials` | Create a credential |
| `DELETE` | `/credentials/{id}` | Delete a credential |

### Create Workflow — Full Example

```bash
curl -X POST "http://localhost:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lead Gen - Local Plumbers",
    "nodes": [...],
    "connections": {...},
    "settings": {
      "executionOrder": "v1"
    }
  }'
```

**Response:**

```json
{
  "id": "abc123",
  "name": "Lead Gen - Local Plumbers",
  "active": false,
  "nodes": [...],
  "connections": {...},
  "createdAt": "2026-02-26T10:00:00.000Z",
  "updatedAt": "2026-02-26T10:00:00.000Z"
}
```

### Activate After Creation

```bash
curl -X POST "http://localhost:5678/api/v1/workflows/abc123/activate" \
  -H "X-N8N-API-KEY: your-api-key"
```

---

## 3. Workflow JSON Schema — Complete Anatomy

Every n8n workflow JSON has this structure:

```json
{
  "name": "Workflow Name",
  "nodes": [
    {
      "id": "unique-node-id",
      "name": "Human Readable Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": {},
      "credentials": {},
      "webhookId": "optional-for-webhooks"
    }
  ],
  "connections": {
    "Source Node Name": {
      "main": [
        [
          {
            "node": "Target Node Name",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner"
  },
  "staticData": null,
  "tags": []
}
```

### Node Object — Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., UUID or descriptive slug like `"trigger-1"`) |
| `name` | string | Display name shown in UI. **Must be unique within the workflow.** Also used as the key in `connections`. |
| `type` | string | The node type identifier (e.g., `"n8n-nodes-base.httpRequest"`) |
| `typeVersion` | number | Version of the node type (usually `1`, some newer nodes use `2`, `3`, or `4`) |
| `position` | [number, number] | `[x, y]` coordinates on the canvas. Start at `[240, 300]` and space 220px apart horizontally. |
| `parameters` | object | Node-specific configuration. Varies per node type. |

### Node Object — Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `credentials` | object | Maps credential type to credential name/ID |
| `webhookId` | string | Auto-generated for webhook/form trigger nodes |
| `disabled` | boolean | If `true`, node is skipped during execution |
| `notes` | string | Sticky note text for documentation |
| `notesInFlow` | boolean | Display notes under node in canvas |

### Position Layout Strategy

For programmatic generation, lay out nodes in a grid:

```
Trigger:     [240, 300]
Node 2:      [460, 300]
Node 3:      [680, 300]
Node 4:      [900, 300]
Branch A:    [680, 160]   (above main line)
Branch B:    [680, 440]   (below main line)
```

Space nodes **220px horizontally** and **140px vertically** for branches.

---

## 4. Node Type Reference (Common Nodes)

### Trigger Nodes (Start a workflow)

| Type Identifier | Name | Use Case |
|----------------|------|----------|
| `n8n-nodes-base.manualTrigger` | Manual Trigger | Test/manual execution |
| `n8n-nodes-base.scheduleTrigger` | Schedule Trigger | Cron/interval based runs |
| `n8n-nodes-base.webhook` | Webhook | Receive HTTP requests |
| `n8n-nodes-base.formTrigger` | Form Trigger | User-facing form input |
| `n8n-nodes-base.emailImap` | Email Trigger (IMAP) | Watch for emails |
| `n8n-nodes-base.n8nTrigger` | n8n Trigger | React to n8n events |

### Core Action Nodes

| Type Identifier | Name | Use Case |
|----------------|------|----------|
| `n8n-nodes-base.httpRequest` | HTTP Request | Call any REST API |
| `n8n-nodes-base.code` | Code | Custom JS/Python logic |
| `n8n-nodes-base.set` | Edit Fields (Set) | Set/transform field values |
| `n8n-nodes-base.if` | If | Conditional branching |
| `n8n-nodes-base.switch` | Switch | Multi-path branching |
| `n8n-nodes-base.filter` | Filter | Filter items by condition |
| `n8n-nodes-base.merge` | Merge | Combine data from branches |
| `n8n-nodes-base.splitInBatches` | Loop Over Items | Batch processing / loops |
| `n8n-nodes-base.respondToWebhook` | Respond to Webhook | Return HTTP response |
| `n8n-nodes-base.wait` | Wait | Pause execution |
| `n8n-nodes-base.stopAndError` | Stop And Error | Halt with error |
| `n8n-nodes-base.noop` | No Operation | Pass-through placeholder |
| `n8n-nodes-base.aggregate` | Aggregate | Combine items into one |
| `n8n-nodes-base.sort` | Sort | Sort items |
| `n8n-nodes-base.limit` | Limit | Cap number of items |
| `n8n-nodes-base.removeDuplicates` | Remove Duplicates | Deduplicate data |
| `n8n-nodes-base.splitOut` | Split Out | Split array fields |
| `n8n-nodes-base.comparedatasets` | Compare Datasets | Diff two datasets |
| `n8n-nodes-base.datetime` | Date & Time | Parse/format dates |
| `n8n-nodes-base.crypto` | Crypto | Hash/encrypt data |
| `n8n-nodes-base.html` | HTML | Extract/generate HTML |
| `n8n-nodes-base.xml` | XML | Parse/generate XML |
| `n8n-nodes-base.markdown` | Markdown | Convert markdown |
| `n8n-nodes-base.executeWorkflow` | Execute Sub-workflow | Call another workflow |
| `n8n-nodes-base.executeCommand` | Execute Command | Run shell command |
| `n8n-nodes-base.sendEmail` | Send Email | SMTP email |

### Popular Integration Nodes

| Type Identifier | Name |
|----------------|------|
| `n8n-nodes-base.googleSheets` | Google Sheets |
| `n8n-nodes-base.gmail` | Gmail |
| `n8n-nodes-base.slack` | Slack |
| `n8n-nodes-base.telegram` | Telegram |
| `n8n-nodes-base.airtable` | Airtable |
| `n8n-nodes-base.notion` | Notion |
| `n8n-nodes-base.postgres` | Postgres |
| `n8n-nodes-base.mysql` | MySQL |
| `n8n-nodes-base.mongodb` | MongoDB |
| `n8n-nodes-base.redis` | Redis |
| `n8n-nodes-base.hubspot` | HubSpot |
| `n8n-nodes-base.discord` | Discord |
| `n8n-nodes-base.wordpress` | WordPress |
| `n8n-nodes-base.shopify` | Shopify |
| `n8n-nodes-base.stripe` | Stripe |
| `n8n-nodes-base.github` | GitHub |
| `n8n-nodes-base.supabase` | Supabase |
| `n8n-nodes-base.googledrive` | Google Drive |
| `n8n-nodes-base.microsoftExcel` | Microsoft Excel 365 |
| `n8n-nodes-base.openweathermap` | OpenWeatherMap |

### Common Node Parameter Examples

**Schedule Trigger (run every hour):**
```json
{
  "id": "schedule-1",
  "name": "Every Hour",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [240, 300],
  "parameters": {
    "rule": {
      "interval": [{ "field": "hours", "hoursInterval": 1 }]
    }
  }
}
```

**HTTP Request (GET):**
```json
{
  "id": "http-1",
  "name": "Fetch Data",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [460, 300],
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "options": {}
  },
  "credentials": {
    "httpHeaderAuth": {
      "id": "cred-id",
      "name": "My API Key"
    }
  }
}
```

**HTTP Request (POST with body):**
```json
{
  "id": "http-post-1",
  "name": "Send Data",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [460, 300],
  "parameters": {
    "url": "https://api.example.com/submit",
    "method": "POST",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify($json) }}",
    "options": {}
  }
}
```

**Code Node (JavaScript):**
```json
{
  "id": "code-1",
  "name": "Process Data",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [680, 300],
  "parameters": {
    "jsCode": "const items = $input.all();\nreturn items.map(item => {\n  item.json.processed = true;\n  return item;\n});"
  }
}
```

**If Node (conditional):**
```json
{
  "id": "if-1",
  "name": "Check Status",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "position": [680, 300],
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "condition-1",
          "leftValue": "={{ $json.status }}",
          "rightValue": "active",
          "operator": {
            "type": "string",
            "operation": "equals"
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```

**Google Sheets (Append Row):**
```json
{
  "id": "sheets-1",
  "name": "Save to Sheet",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4.5,
  "position": [900, 300],
  "parameters": {
    "operation": "appendOrUpdate",
    "documentId": {
      "__rl": true,
      "value": "your-spreadsheet-id",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "Sheet1",
      "mode": "list"
    },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {}
    },
    "options": {}
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "cred-id",
      "name": "Google Sheets"
    }
  }
}
```

**Edit Fields / Set Node:**
```json
{
  "id": "set-1",
  "name": "Set Fields",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [460, 300],
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "id": "assign-1",
          "name": "fullName",
          "value": "={{ $json.firstName }} {{ $json.lastName }}",
          "type": "string"
        },
        {
          "id": "assign-2",
          "name": "timestamp",
          "value": "={{ $now.toISO() }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

**Webhook Trigger:**
```json
{
  "id": "webhook-1",
  "name": "Receive Webhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [240, 300],
  "parameters": {
    "httpMethod": "POST",
    "path": "my-webhook-path",
    "responseMode": "responseNode",
    "options": {}
  },
  "webhookId": "generated-uuid"
}
```

---

## 5. Connection Schema Deep Dive

Connections define data flow. The key is the **source node's display name** (not ID).

### Basic Linear Connection

```
Node A → Node B → Node C
```

```json
{
  "connections": {
    "Node A": {
      "main": [
        [
          { "node": "Node B", "type": "main", "index": 0 }
        ]
      ]
    },
    "Node B": {
      "main": [
        [
          { "node": "Node C", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

### Branching (If Node — true/false outputs)

The If node has **two outputs**: index 0 = true, index 1 = false.

```
             → [true]  Node B
If Node ─────┤
             → [false] Node C
```

```json
{
  "connections": {
    "Check Status": {
      "main": [
        [
          { "node": "Handle Active", "type": "main", "index": 0 }
        ],
        [
          { "node": "Handle Inactive", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

**Key insight:** `main` is an array of arrays. Each inner array represents one output port. Index 0 is the first output (true), index 1 is the second output (false).

### One-to-Many (Fan-out)

```
Trigger → Node B
        → Node C
```

```json
{
  "connections": {
    "Trigger": {
      "main": [
        [
          { "node": "Node B", "type": "main", "index": 0 },
          { "node": "Node C", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

### Merge Node (Many-to-One)

The Merge node accepts inputs on different index ports:

```json
{
  "connections": {
    "Branch A Result": {
      "main": [
        [
          { "node": "Merge", "type": "main", "index": 0 }
        ]
      ]
    },
    "Branch B Result": {
      "main": [
        [
          { "node": "Merge", "type": "main", "index": 1 }
        ]
      ]
    }
  }
}
```

### Switch Node (Multiple Outputs)

Switch can have many output ports. Each rule maps to an output index:

```json
{
  "connections": {
    "Route By Type": {
      "main": [
        [{ "node": "Handle Email", "type": "main", "index": 0 }],
        [{ "node": "Handle SMS", "type": "main", "index": 0 }],
        [{ "node": "Handle Webhook", "type": "main", "index": 0 }],
        [{ "node": "Handle Fallback", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

---

## 6. Credential System

Credentials are referenced by type and name/ID. They must already exist in your n8n instance — the workflow JSON only references them, it doesn't create them.

### How Credentials Appear in Node JSON

```json
{
  "credentials": {
    "httpHeaderAuth": {
      "id": "cred-abc123",
      "name": "Serper API Key"
    }
  }
}
```

### Common Credential Types

| Credential Type Key | Service |
|---------------------|---------|
| `httpHeaderAuth` | Generic header auth (API keys) |
| `httpBasicAuth` | Basic auth |
| `httpQueryAuth` | Query parameter auth |
| `oAuth2Api` | Generic OAuth2 |
| `googleSheetsOAuth2Api` | Google Sheets |
| `gmailOAuth2` | Gmail |
| `slackOAuth2Api` | Slack |
| `notionApi` | Notion |
| `airtableTokenApi` | Airtable |
| `telegramApi` | Telegram |
| `postgresSql` | PostgreSQL |
| `anthropicApi` | Anthropic (Claude) |
| `openAiApi` | OpenAI |

### Listing Your Available Credentials

```bash
curl -H "X-N8N-API-KEY: your-key" \
     http://localhost:5678/api/v1/credentials
```

Your terminal agent should call this to know what credentials are available before generating workflows.

---

## 7. AI & LangChain Nodes

n8n has native AI capabilities via LangChain integration nodes. These use a **cluster node** architecture where a root node connects to sub-nodes.

### Root Nodes (AI)

| Type | Name |
|------|------|
| `@n8n/n8n-nodes-langchain.agent` | AI Agent |
| `@n8n/n8n-nodes-langchain.chainLlm` | Basic LLM Chain |
| `@n8n/n8n-nodes-langchain.chainRetrievalQa` | Q&A Chain |
| `@n8n/n8n-nodes-langchain.chainSummarization` | Summarization Chain |
| `n8n-nodes-langchain.chatTrigger` | Chat Trigger |

### Sub-Nodes (Models, Memory, Tools)

| Type | Name |
|------|------|
| `@n8n/n8n-nodes-langchain.lmChatAnthropic` | Anthropic Chat Model |
| `@n8n/n8n-nodes-langchain.lmChatOpenAi` | OpenAI Chat Model |
| `@n8n/n8n-nodes-langchain.lmChatOllama` | Ollama Chat Model |
| `@n8n/n8n-nodes-langchain.memoryBufferWindow` | Simple Memory |
| `@n8n/n8n-nodes-langchain.toolCode` | Custom Code Tool |
| `@n8n/n8n-nodes-langchain.toolWorkflow` | Call n8n Workflow Tool |
| `@n8n/n8n-nodes-langchain.toolWikipedia` | Wikipedia Tool |

### AI Node Connection Type

AI sub-nodes use a different connection type: `ai_languageModel`, `ai_tool`, `ai_memory`, etc.

```json
{
  "connections": {
    "Anthropic Claude": {
      "ai_languageModel": [
        [
          { "node": "AI Agent", "type": "ai_languageModel", "index": 0 }
        ]
      ]
    },
    "Custom Tool": {
      "ai_tool": [
        [
          { "node": "AI Agent", "type": "ai_tool", "index": 0 }
        ]
      ]
    }
  }
}
```

---

## 8. Workflow Templates Library (Your Agency Patterns)

These are pre-built JSON patterns your terminal agent should select from and customize.

### Template 1: Lead Gen Scraper

**Use when:** "scrape leads", "find businesses", "lead generation"

Pattern: `Schedule Trigger → HTTP Request (Serper) → Code (parse) → HTTP Request (Firecrawl enrich) → Google Sheets`

### Template 2: Webhook → Process → Respond

**Use when:** "API endpoint", "receive webhook", "webhook processor"

Pattern: `Webhook → Code (validate/process) → If (check result) → Respond to Webhook`

### Template 3: Email Monitor → Action

**Use when:** "watch emails", "email trigger", "incoming email"

Pattern: `Email Trigger → If (filter) → Code (extract) → Slack/Sheets/etc`

### Template 4: Scheduled Report

**Use when:** "daily report", "weekly summary", "scheduled email"

Pattern: `Schedule Trigger → HTTP Request (gather data) → Code (format) → Send Email`

### Template 5: AI Agent Chat

**Use when:** "AI agent", "chatbot", "LLM workflow"

Pattern: `Chat Trigger → AI Agent [+ Model sub-node + Memory sub-node + Tool sub-nodes]`

### Template 6: Data Sync

**Use when:** "sync data", "mirror database", "keep in sync"

Pattern: `Schedule Trigger → Source (Sheets/DB) → Compare Datasets → If (changes) → Update Target`

### Template 7: Multi-Step Form

**Use when:** "form", "intake form", "client onboarding"

Pattern: `Form Trigger → Code (validate) → Google Sheets → Send Email (confirmation)`

---

## 9. Validation & Error Handling

### Pre-Deployment Validation Checklist

Your terminal agent should validate before pushing to the API:

1. **At least one trigger node exists** — workflows need a trigger
2. **All node names are unique** — connections reference nodes by name
3. **Every node (except triggers) has an incoming connection** — orphan nodes won't execute
4. **Connection node names match actual node names exactly** — case-sensitive
5. **Required parameters are set** — e.g., HTTP Request needs a `url`
6. **Credential references exist** — check against `/api/v1/credentials`
7. **`typeVersion` matches available version** — wrong version = broken node
8. **Valid JSON** — lint before sending

### Error Handling in Workflows

Add error handling with the Error Trigger node:

```json
{
  "id": "error-handler",
  "name": "On Error",
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [240, 600],
  "parameters": {}
}
```

Set workflow-level error handling in settings:

```json
{
  "settings": {
    "executionOrder": "v1",
    "errorWorkflow": "error-handler-workflow-id"
  }
}
```

---

## 10. Terminal System Prompt (Copy-Paste Ready)

This is the system prompt for the AI agent sitting in your dashboard terminal. Copy this into your terminal's prompt configuration.

---

```
You are the n8n Workflow Builder Agent for Dylan's AI Agent UI Dashboard. You build and deploy n8n automation workflows via natural language commands entered in this terminal.

## YOUR CAPABILITIES

1. **Generate** valid n8n workflow JSON from natural language descriptions
2. **Deploy** workflows to n8n via the REST API
3. **Activate/deactivate** workflows
4. **List** existing workflows and credentials
5. **Update** existing workflows
6. **Execute** workflows on demand

## ENVIRONMENT

- n8n API Base: {{N8N_API_URL}} (e.g., http://localhost:5678/api/v1)
- n8n API Key: {{N8N_API_KEY}}
- Available credentials: Query /api/v1/credentials before generating workflows that need auth

## WORKFLOW GENERATION RULES

When the user describes a workflow, you MUST:

1. Parse the intent and identify: trigger type, data sources, transformations, outputs
2. Select the correct node types from the reference below
3. Generate valid JSON with:
   - Unique node names
   - Proper typeVersion for each node
   - Correct position layout (start at [240,300], space 220px apart horizontally)
   - Valid connections using node display names as keys
   - Credential references for any authenticated nodes
4. Validate the JSON before deployment
5. Show the user a summary before deploying:
   - Workflow name
   - Node count and types
   - Trigger type
   - Output destination
6. Deploy via POST /api/v1/workflows
7. Optionally activate via POST /api/v1/workflows/{id}/activate

## NODE TYPE QUICK REFERENCE

### Triggers
- Manual: n8n-nodes-base.manualTrigger (v1)
- Schedule: n8n-nodes-base.scheduleTrigger (v1.2)
- Webhook: n8n-nodes-base.webhook (v2)
- Form: n8n-nodes-base.formTrigger (v2.2)
- Email IMAP: n8n-nodes-base.emailImap (v2)

### Core Actions
- HTTP Request: n8n-nodes-base.httpRequest (v4.2)
- Code (JS/Python): n8n-nodes-base.code (v2)
- Edit Fields/Set: n8n-nodes-base.set (v3.4)
- If: n8n-nodes-base.if (v2)
- Switch: n8n-nodes-base.switch (v3)
- Filter: n8n-nodes-base.filter (v2)
- Merge: n8n-nodes-base.merge (v3)
- Loop/Batch: n8n-nodes-base.splitInBatches (v3)
- Wait: n8n-nodes-base.wait (v1.1)
- Respond to Webhook: n8n-nodes-base.respondToWebhook (v1.1)
- Send Email: n8n-nodes-base.sendEmail (v2.2)
- Execute Sub-workflow: n8n-nodes-base.executeWorkflow (v1)
- Aggregate: n8n-nodes-base.aggregate (v1)
- Sort: n8n-nodes-base.sort (v1)
- Remove Duplicates: n8n-nodes-base.removeDuplicates (v1)

### Popular Integrations
- Google Sheets: n8n-nodes-base.googleSheets (v4.5)
- Gmail: n8n-nodes-base.gmail (v2.1)
- Slack: n8n-nodes-base.slack (v2.2)
- Telegram: n8n-nodes-base.telegram (v1.2)
- Airtable: n8n-nodes-base.airtable (v2.1)
- Notion: n8n-nodes-base.notion (v2.2)
- Postgres: n8n-nodes-base.postgres (v2.5)
- Supabase: n8n-nodes-base.supabase (v1)
- Discord: n8n-nodes-base.discord (v2)
- WordPress: n8n-nodes-base.wordpress (v1)
- Shopify: n8n-nodes-base.shopify (v1)

### AI / LangChain
- AI Agent: @n8n/n8n-nodes-langchain.agent (v1.7)
- Chat Trigger: n8n-nodes-langchain.chatTrigger (v1.1)
- Anthropic Model: @n8n/n8n-nodes-langchain.lmChatAnthropic (v1.3)
- OpenAI Model: @n8n/n8n-nodes-langchain.lmChatOpenAi (v1.2)
- Simple Memory: @n8n/n8n-nodes-langchain.memoryBufferWindow (v1.3)
- Code Tool: @n8n/n8n-nodes-langchain.toolCode (v1.1)
- Workflow Tool: @n8n/n8n-nodes-langchain.toolWorkflow (v2)

## CONNECTION FORMAT

Connections use the SOURCE NODE'S DISPLAY NAME as the key:
```json
{
  "Source Node Name": {
    "main": [
      [
        { "node": "Target Node Name", "type": "main", "index": 0 }
      ]
    ]
  }
}
```

For If/Switch nodes with multiple outputs, each output is a separate inner array:
```json
{
  "If Node": {
    "main": [
      [{ "node": "True Branch", "type": "main", "index": 0 }],
      [{ "node": "False Branch", "type": "main", "index": 0 }]
    ]
  }
}
```

For AI sub-nodes, use ai_languageModel, ai_tool, ai_memory types instead of "main".

## WORKFLOW TEMPLATES

Match user intent to these patterns:

**Lead Generation**: Schedule → HTTP (Serper API) → Code (parse results) → HTTP (Firecrawl/enrich) → Filter → Google Sheets
**Webhook API**: Webhook → Code (validate) → If (check) → Respond to Webhook
**Scheduled Report**: Schedule → HTTP (data source) → Code (format) → Send Email
**AI Chatbot**: Chat Trigger → AI Agent [+ Anthropic Model + Memory + Tools]
**Data Sync**: Schedule → Source DB/API → Compare → If (changed) → Target DB/API
**Email Automation**: Email Trigger → If (filter) → Code (extract) → Action nodes
**Form to CRM**: Form Trigger → Code (validate) → Google Sheets → Send Email

## DEPLOYMENT FLOW

1. Generate workflow JSON
2. Show summary to user, ask for confirmation
3. POST to /api/v1/workflows with the JSON body
4. Return the workflow ID and n8n editor URL
5. Ask if user wants to activate it
6. If yes, POST to /api/v1/workflows/{id}/activate

## COMMANDS THE USER CAN TYPE

- "build [description]" — Generate and deploy a workflow
- "list workflows" — GET /api/v1/workflows
- "list credentials" — GET /api/v1/credentials
- "activate [id]" — Activate a workflow
- "deactivate [id]" — Deactivate a workflow
- "run [id]" — Execute a workflow
- "delete [id]" — Delete a workflow (confirm first!)
- "show [id]" — Get workflow details
- "update [id] [changes]" — Modify a workflow
- "help" — Show available commands

## RESPONSE FORMAT

Always respond with:
1. What you understood from the request
2. The plan (nodes and flow)
3. The generated JSON (in a code block)
4. Deployment status
5. Next steps or suggestions

## IMPORTANT RULES

- ALWAYS validate JSON before deploying
- NEVER deploy without showing the user a summary first
- ALWAYS check available credentials before referencing them
- Use descriptive node names (not generic "Node 1", "Node 2")
- Default to Schedule Trigger if no trigger type is specified
- Default to Google Sheets output if no output is specified
- Include error handling nodes for production workflows
- Space nodes properly on the canvas for readability
```

---

## Quick Start Checklist

1. **Get your n8n API key**: Settings → n8n API → Create API Key
2. **Set environment variables** in your dashboard:
   - `N8N_API_URL` = your n8n instance URL + `/api/v1`
   - `N8N_API_KEY` = your generated API key
3. **Copy the terminal system prompt** (Section 10) into your dashboard's terminal agent
4. **Test with**: `list workflows` to verify API connectivity
5. **Build your first workflow**: `build a lead scraper that searches for plumbers in your area using Serper and saves results to Google Sheets every day at 9am`

---

## API Quick Reference Card

```bash
# List all workflows
curl -H "X-N8N-API-KEY: $KEY" $URL/workflows

# Create workflow
curl -X POST -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"...","nodes":[...],"connections":{...},"settings":{"executionOrder":"v1"}}' \
  $URL/workflows

# Activate
curl -X POST -H "X-N8N-API-KEY: $KEY" $URL/workflows/{id}/activate

# Deactivate
curl -X POST -H "X-N8N-API-KEY: $KEY" $URL/workflows/{id}/deactivate

# Execute
curl -X POST -H "X-N8N-API-KEY: $KEY" $URL/workflows/{id}/run

# Delete
curl -X DELETE -H "X-N8N-API-KEY: $KEY" $URL/workflows/{id}

# List credentials
curl -H "X-N8N-API-KEY: $KEY" $URL/credentials

# Get executions
curl -H "X-N8N-API-KEY: $KEY" $URL/executions
```

---

*Built for Dylan's AI Agent UI — Command Dashboard v1*
*Last updated: February 2026*
