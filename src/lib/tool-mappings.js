// tool-mappings.js — AgentTool → n8n node type mappings (15 tools)

export const TOOL_N8N_MAPPINGS = {
  calendar: {
    description: 'Check availability and book/cancel appointments',
    n8nNodeType: 'n8n-nodes-base.googleCalendar',
    n8nCredentialType: 'googleCalendarOAuth2Api',
    configTemplate: {
      operations: ['getAvailability', 'createEvent', 'deleteEvent', 'updateEvent'],
    },
  },

  email: {
    description: 'Send emails (confirmations, follow-ups, notifications)',
    n8nNodeType: 'n8n-nodes-base.gmail',
    n8nCredentialType: 'gmailOAuth2',
    configTemplate: {
      operations: ['sendEmail'],
    },
  },

  crm: {
    description: 'Log leads, update records in Google Sheets or CRM',
    n8nNodeType: 'n8n-nodes-base.googleSheets',
    n8nCredentialType: 'googleSheetsOAuth2Api',
    configTemplate: {
      operations: ['appendRow', 'updateRow', 'lookupRow'],
    },
  },

  sms: {
    description: 'Send SMS messages via Twilio or similar',
    n8nNodeType: 'n8n-nodes-base.twilio',
    n8nCredentialType: 'twilioApi',
    configTemplate: {
      operations: ['sendSms'],
    },
  },

  whatsapp: {
    description: 'Send and receive WhatsApp messages',
    n8nNodeType: 'n8n-nodes-base.whatsapp',
    n8nCredentialType: 'whatsappApi',
    configTemplate: {
      operations: ['sendMessage'],
    },
  },

  webhook: {
    description: 'Trigger external systems via webhook',
    n8nNodeType: 'n8n-nodes-base.httpRequest',
    n8nCredentialType: 'httpHeaderAuth',
    configTemplate: {
      method: 'POST',
    },
  },

  web_search: {
    description: 'Search the web for live information',
    n8nNodeType: '@n8n/n8n-nodes-langchain.toolCode',
    n8nCredentialType: 'httpHeaderAuth',
    configTemplate: {
      searchProvider: 'serper',
    },
  },

  calculator: {
    description: 'Perform calculations (pricing, quotes, estimates)',
    n8nNodeType: '@n8n/n8n-nodes-langchain.toolCalculator',
    n8nCredentialType: '',
    configTemplate: {},
  },

  human_handoff: {
    description: 'Escalate conversation to a human operator',
    n8nNodeType: 'n8n-nodes-base.slack',
    n8nCredentialType: 'slackOAuth2Api',
    configTemplate: {
      channel: '#escalations',
      operations: ['sendMessage'],
    },
  },

  document_lookup: {
    description: 'Search uploaded documents for answers (RAG)',
    n8nNodeType: '@n8n/n8n-nodes-langchain.toolVectorStore',
    n8nCredentialType: 'pineconeApi',
    configTemplate: {},
  },

  inventory_check: {
    description: 'Check stock levels or product availability',
    n8nNodeType: 'n8n-nodes-base.httpRequest',
    n8nCredentialType: 'httpHeaderAuth',
    configTemplate: {
      method: 'GET',
    },
  },

  booking_system: {
    description: 'Interface with booking/reservation system',
    n8nNodeType: 'n8n-nodes-base.httpRequest',
    n8nCredentialType: 'httpHeaderAuth',
    configTemplate: {
      operations: ['checkAvailability', 'createBooking', 'cancelBooking'],
    },
  },

  payment_link: {
    description: 'Generate payment links via Stripe or similar',
    n8nNodeType: 'n8n-nodes-base.stripe',
    n8nCredentialType: 'stripeApi',
    configTemplate: {
      operations: ['createPaymentLink'],
    },
  },

  form_builder: {
    description: 'Create and serve dynamic forms for data collection',
    n8nNodeType: 'n8n-nodes-base.formTrigger',
    n8nCredentialType: '',
    configTemplate: {},
  },

  slack_notify: {
    description: 'Send notifications to Slack channels',
    n8nNodeType: 'n8n-nodes-base.slack',
    n8nCredentialType: 'slackOAuth2Api',
    configTemplate: {
      operations: ['sendMessage'],
    },
  },
};
