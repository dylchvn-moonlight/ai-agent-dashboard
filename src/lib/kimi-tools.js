// kimi-tools.js — Kimi 2.5 function calling tool definitions
// These tools allow Kimi to configure agents, generate prompts/workflows, and manage n8n.

export const KIMI_TOOLS = [
  // ─── Agent Configuration ───────────────────────────────
  {
    type: 'function',
    function: {
      name: 'configure_agent',
      description: 'Create a complete agent configuration based on user selections for role, industry, tools, persona, and business details. Call this when the user provides agent requirements.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent display name' },
          role: {
            type: 'string',
            enum: ['receptionist', 'lead_qualifier', 'customer_support', 'sales_assistant', 'onboarding_agent', 'content_generator', 'data_collector', 'appointment_scheduler', 'faq_bot', 'review_manager'],
            description: 'The agent role type',
          },
          industry: {
            type: 'string',
            enum: ['real_estate', 'automotive', 'trades', 'medical_dental', 'hospitality', 'legal', 'ecommerce', 'fitness_wellness', 'agency', 'financial_services', 'education', 'construction', 'custom'],
            description: 'The industry this agent serves',
          },
          tools: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['calendar', 'email', 'crm', 'sms', 'whatsapp', 'webhook', 'web_search', 'calculator', 'human_handoff', 'document_lookup', 'inventory_check', 'booking_system', 'payment_link', 'slack_notify'],
            },
            description: 'Tools the agent should have access to',
          },
          persona_tone: {
            type: 'string',
            enum: ['professional', 'friendly', 'casual', 'formal', 'empathetic'],
            description: 'Agent communication tone',
          },
          persona_name: { type: 'string', description: 'Agent character name' },
          knowledge_sources: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['business_sheet', 'website_scrape', 'document_upload', 'api_endpoint', 'vector_store', 'google_sheets', 'notion', 'prompt_only'],
            },
            description: 'Where the agent gets its information',
          },
          channels: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['web_chat', 'whatsapp', 'telegram', 'sms', 'voice', 'email', 'slack', 'api_endpoint'],
            },
            description: 'Where the agent will be deployed',
          },
          business_name: { type: 'string', description: 'Business name' },
          business_address: { type: 'string', description: 'Business address' },
          business_phone: { type: 'string', description: 'Business phone' },
          business_email: { type: 'string', description: 'Business email' },
          business_website: { type: 'string', description: 'Business website URL' },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'string' },
                duration: { type: 'number' },
              },
            },
            description: 'Services the business offers',
          },
        },
        required: ['name', 'role', 'industry', 'persona_tone', 'persona_name'],
      },
    },
  },

  // ─── System Prompt Generation ──────────────────────────
  {
    type: 'function',
    function: {
      name: 'generate_system_prompt',
      description: 'Generate the complete system prompt for a configured agent. Call after configure_agent.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'The agent configuration ID' },
        },
        required: ['agent_id'],
      },
    },
  },

  // ─── n8n Workflow Generation ───────────────────────────
  {
    type: 'function',
    function: {
      name: 'generate_n8n_workflow',
      description: 'Generate the complete n8n workflow JSON for a configured agent, including all nodes, connections, and credential references.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'The agent configuration ID' },
          trigger_type: {
            type: 'string',
            enum: ['chat', 'webhook', 'schedule', 'form'],
            description: 'How the workflow is triggered',
          },
        },
        required: ['agent_id'],
      },
    },
  },

  // ─── Deploy to n8n ─────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'deploy_workflow',
      description: 'Deploy a generated workflow to the n8n instance via REST API.',
      parameters: {
        type: 'object',
        properties: {
          workflow_json: { type: 'object', description: 'The complete n8n workflow JSON' },
          activate: { type: 'boolean', description: 'Whether to activate immediately' },
        },
        required: ['workflow_json'],
      },
    },
  },

  // ─── n8n Management ────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description: 'List all workflows on the n8n instance.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_credentials',
      description: 'List all available credentials on the n8n instance.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activate_workflow',
      description: 'Activate a deployed workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' },
        },
        required: ['workflow_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deactivate_workflow',
      description: 'Deactivate a deployed workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' },
        },
        required: ['workflow_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_workflow',
      description: 'Delete a workflow. Requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' },
          confirmed: { type: 'boolean' },
        },
        required: ['workflow_id', 'confirmed'],
      },
    },
  },

  // ─── Agent Library ─────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_industry_profiles',
      description: 'List all available industry profiles and their details.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_role_templates',
      description: 'List all available agent role templates.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_available_tools',
      description: 'List all tools an agent can use.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

/**
 * Kimi 2.5 Master System Prompt for the Agent Creator.
 * Use this when the Kimi provider is being used for agent creation tasks.
 */
export const KIMI_AGENT_CREATOR_SYSTEM_PROMPT = `You are the AI Agent Creator for Dylan's AI Agent UI Dashboard. You help design, configure, and deploy AI agents for various industries and use cases.

## YOUR ROLE

You are a specialist in creating AI agents that get deployed as n8n workflows. When a user wants to create an agent, you:

1. UNDERSTAND what they need (role, industry, tools, persona)
2. CONFIGURE the agent using structured profiles
3. GENERATE the system prompt tailored to the specific business and industry
4. BUILD the n8n workflow JSON with correct nodes, connections, and credentials
5. DEPLOY the workflow to n8n via the API
6. CONFIRM deployment and provide next steps

## AGENT CREATION WORKFLOW

When a user says something like "create a receptionist for a car dealership":

Step 1 — IDENTIFY the configuration:
  - Role: receptionist
  - Industry: automotive
  - Ask for any missing details: business name, services, hours, preferred tone

Step 2 — CONFIGURE using tool call: configure_agent
  - Map to industry profile (terminology, FAQs, compliance rules)
  - Map to role template (goals, KPIs)
  - Select appropriate tools and knowledge sources

Step 3 — GENERATE system prompt using tool call: generate_system_prompt
  - Combine role + industry + business details + persona + guardrails
  - Include industry-specific terminology and compliance rules

Step 4 — BUILD n8n workflow using tool call: generate_n8n_workflow
  - Chat Trigger or Webhook as entry point
  - AI Agent node with system prompt
  - LLM sub-node (configured model)
  - Memory sub-node for conversation context
  - Tool sub-nodes for each enabled capability

Step 5 — DEPLOY using tool call: deploy_workflow
  - Show summary to user first
  - Deploy to n8n
  - Optionally activate

## AVAILABLE INDUSTRIES

real_estate | automotive | trades | medical_dental | hospitality | legal | ecommerce | fitness_wellness | agency | financial_services | education | construction | custom

## AVAILABLE ROLES

receptionist | lead_qualifier | customer_support | sales_assistant | onboarding_agent | content_generator | data_collector | appointment_scheduler | faq_bot | review_manager

## AVAILABLE TOOLS

calendar | email | crm | sms | whatsapp | webhook | web_search | calculator | human_handoff | document_lookup | inventory_check | booking_system | payment_link | slack_notify

## KNOWLEDGE SOURCES

business_sheet | website_scrape | document_upload | api_endpoint | vector_store | google_sheets | notion | prompt_only

## GUIDELINES

- Always ask for missing critical information before configuring
- Use industry-specific terminology in the generated prompts
- Include appropriate guardrails and compliance rules per industry
- Map tools to their n8n node equivalents when generating workflows
- Validate the workflow before deployment
- Provide clear summaries at each step`;
