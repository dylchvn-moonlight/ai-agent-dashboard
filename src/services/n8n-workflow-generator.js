// n8n-workflow-generator.js — Takes AgentConfig → generates n8n workflow JSON
import { TOOL_N8N_MAPPINGS } from '@/lib/tool-mappings';
import { generateSystemPrompt } from './prompt-generator';

let nodeIdCounter = 0;

function nextId() {
  return `node-${++nodeIdCounter}`;
}

/**
 * Generate a complete n8n workflow JSON from an agent configuration.
 * @param {object} agentConfig - The full agent config object
 * @param {string} triggerType - 'chat' | 'webhook' | 'schedule' | 'form'
 * @returns {object} Complete n8n workflow JSON
 */
export function generateN8nWorkflow(agentConfig, triggerType = 'chat') {
  nodeIdCounter = 0;

  const systemPrompt = agentConfig.systemPrompt || generateSystemPrompt(agentConfig);
  const agentName = agentConfig.business?.name
    ? `${agentConfig.persona?.name || 'Agent'} - ${agentConfig.business.name}`
    : agentConfig.persona?.name || 'AI Agent';

  const nodes = [];
  const connections = {};
  let xPos = 240;
  const yPos = 300;
  const SPACING = 220;

  // --- 1. Trigger Node ---
  const triggerNode = createTriggerNode(triggerType, xPos, yPos);
  nodes.push(triggerNode);
  xPos += SPACING;

  // --- 2. AI Agent Node ---
  const aiAgentNode = {
    id: nextId(),
    name: 'AI Agent',
    type: '@n8n/n8n-nodes-langchain.agent',
    typeVersion: 1.7,
    position: [xPos, yPos],
    parameters: {
      options: {
        systemMessage: systemPrompt,
      },
    },
  };
  nodes.push(aiAgentNode);

  // Connect trigger → AI Agent
  connections[triggerNode.name] = {
    main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
  };

  xPos += SPACING;

  // --- 3. LLM Model Sub-Node (connects to AI Agent) ---
  const llmNode = {
    id: nextId(),
    name: 'OpenAI Chat Model',
    type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    typeVersion: 1,
    position: [xPos - SPACING, yPos + 160],
    parameters: {
      model: 'gpt-4o',
      options: {
        temperature: 0.7,
      },
    },
    credentials: {
      openAiApi: { id: '', name: 'OpenAI' },
    },
  };
  nodes.push(llmNode);

  // AI Agent has sub-node connections (ai_languageModel)
  if (!connections['AI Agent']) {
    connections['AI Agent'] = {};
  }
  // LLM → AI Agent (ai_languageModel input)
  connections['OpenAI Chat Model'] = {
    ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
  };

  // --- 4. Memory Sub-Node ---
  const memoryNode = {
    id: nextId(),
    name: 'Window Buffer Memory',
    type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
    typeVersion: 1.3,
    position: [xPos - SPACING + 180, yPos + 160],
    parameters: {
      sessionIdType: 'customKey',
      sessionKey: 'chat_session',
      contextWindowLength: 10,
    },
  };
  nodes.push(memoryNode);

  connections['Window Buffer Memory'] = {
    ai_memory: [[{ node: 'AI Agent', type: 'ai_memory', index: 0 }]],
  };

  // --- 5. Tool Sub-Nodes ---
  const enabledTools = (agentConfig.tools || []).filter(t => t.enabled);
  let toolYOffset = yPos + 320;

  enabledTools.forEach((tool) => {
    const mapping = TOOL_N8N_MAPPINGS[tool.type];
    if (!mapping) return;

    const toolNode = {
      id: nextId(),
      name: `Tool: ${tool.type.replace(/_/g, ' ')}`,
      type: mapping.n8nNodeType,
      typeVersion: 1,
      position: [xPos - SPACING, toolYOffset],
      parameters: { ...mapping.configTemplate },
    };

    if (mapping.n8nCredentialType) {
      toolNode.credentials = {
        [mapping.n8nCredentialType]: { id: '', name: mapping.n8nCredentialType },
      };
    }

    nodes.push(toolNode);

    // Connect tool → AI Agent (ai_tool input)
    connections[toolNode.name] = {
      ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
    };

    toolYOffset += 100;
  });

  // --- 6. Output / Response Node ---
  if (triggerType === 'webhook') {
    const respondNode = {
      id: nextId(),
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [xPos, yPos],
      parameters: {
        respondWith: 'text',
        responseBody: '={{ $json.output }}',
      },
    };
    nodes.push(respondNode);

    connections['AI Agent'] = {
      ...connections['AI Agent'],
      main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
    };
  }

  // --- Build final workflow ---
  const workflow = {
    name: agentName,
    nodes,
    connections,
    settings: {
      executionOrder: 'v1',
      saveManualExecutions: true,
      callerPolicy: 'workflowsFromSameOwner',
    },
    staticData: null,
    tags: [{ name: 'ai-agent-dashboard' }],
  };

  return workflow;
}

/**
 * Create a trigger node based on trigger type.
 */
function createTriggerNode(triggerType, x, y) {
  switch (triggerType) {
    case 'webhook':
      return {
        id: nextId(),
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [x, y],
        parameters: {
          httpMethod: 'POST',
          path: 'agent-webhook',
          responseMode: 'responseNode',
          options: {},
        },
        webhookId: crypto.randomUUID ? crypto.randomUUID() : `wh-${Date.now()}`,
      };

    case 'schedule':
      return {
        id: nextId(),
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [x, y],
        parameters: {
          rule: {
            interval: [{ field: 'hours', hoursInterval: 1 }],
          },
        },
      };

    case 'form':
      return {
        id: nextId(),
        name: 'Form Trigger',
        type: 'n8n-nodes-base.formTrigger',
        typeVersion: 2.2,
        position: [x, y],
        parameters: {
          formTitle: 'Contact Form',
          formFields: {
            values: [
              { fieldLabel: 'Name', fieldType: 'text', requiredField: true },
              { fieldLabel: 'Message', fieldType: 'textarea', requiredField: true },
            ],
          },
          options: {},
        },
      };

    case 'chat':
    default:
      return {
        id: nextId(),
        name: 'Chat Trigger',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        typeVersion: 1.1,
        position: [x, y],
        parameters: {
          options: {},
        },
      };
  }
}

/**
 * Validate a generated workflow JSON.
 * @param {object} workflow - The workflow JSON to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWorkflow(workflow) {
  const errors = [];

  if (!workflow.name) errors.push('Workflow name is required');
  if (!workflow.nodes?.length) errors.push('Workflow must have at least one node');

  // Check for trigger
  const hasTrigger = workflow.nodes?.some(n =>
    n.type?.includes('Trigger') || n.type?.includes('trigger') || n.type?.includes('webhook')
  );
  if (!hasTrigger) errors.push('Workflow must have a trigger node');

  // Check for unique names
  const names = workflow.nodes?.map(n => n.name) || [];
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length) errors.push(`Duplicate node names: ${duplicates.join(', ')}`);

  return { valid: errors.length === 0, errors };
}
