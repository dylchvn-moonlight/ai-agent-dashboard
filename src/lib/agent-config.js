// agent-config.js — AgentConfig schema shapes, defaults, and validators
// Mirrors the TypeScript interfaces from agent-creator-config.md as plain JS.

export const AGENT_ROLE_TYPES = [
  'receptionist',
  'lead_qualifier',
  'customer_support',
  'sales_assistant',
  'onboarding_agent',
  'content_generator',
  'data_collector',
  'appointment_scheduler',
  'faq_bot',
  'review_manager',
];

export const INDUSTRY_TYPES = [
  'real_estate',
  'automotive',
  'trades',
  'medical_dental',
  'hospitality',
  'legal',
  'ecommerce',
  'fitness_wellness',
  'agency',
  'financial_services',
  'education',
  'construction',
  'custom',
];

export const KNOWLEDGE_SOURCE_TYPES = [
  'business_sheet',
  'website_scrape',
  'document_upload',
  'api_endpoint',
  'vector_store',
  'google_sheets',
  'notion',
  'prompt_only',
];

export const AGENT_TOOL_TYPES = [
  'calendar',
  'email',
  'crm',
  'sms',
  'whatsapp',
  'webhook',
  'web_search',
  'calculator',
  'human_handoff',
  'document_lookup',
  'inventory_check',
  'booking_system',
  'payment_link',
  'form_builder',
  'slack_notify',
];

export const DEPLOYMENT_CHANNELS = [
  'web_chat',
  'whatsapp',
  'telegram',
  'sms',
  'voice',
  'email',
  'slack',
  'api_endpoint',
];

export const PERSONA_TONES = ['professional', 'friendly', 'casual', 'formal', 'empathetic'];

export const RESPONSE_LENGTHS = ['concise', 'moderate', 'detailed'];

/**
 * Default operating hours schedule (Mon-Fri 9-5, weekends closed).
 */
export const DEFAULT_OPERATING_HOURS = {
  timezone: 'America/New_York',
  schedule: [
    { day: 'Monday', open: '09:00', close: '17:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '17:00', closed: false },
    { day: 'Friday', open: '09:00', close: '17:00', closed: false },
    { day: 'Saturday', open: '10:00', close: '14:00', closed: true },
    { day: 'Sunday', open: '10:00', close: '14:00', closed: true },
  ],
};

/**
 * Create a default AgentConfig object with sensible defaults.
 */
export function createDefaultAgentConfig(overrides = {}) {
  return {
    // Identity
    role: null,
    industry: null,

    // Business details
    business: {
      name: '',
      type: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      operatingHours: { ...DEFAULT_OPERATING_HOURS },
      services: [],
      policies: [],
      teamMembers: [],
    },

    // Persona
    persona: {
      name: '',
      tone: 'friendly',
      language: 'English',
      responseLength: 'moderate',
      greeting: '',
      signoff: '',
      personality: ['helpful', 'professional'],
      avatarUrl: '',
    },

    // Guardrails
    guardrails: {
      boundaries: [
        'Never provide medical, legal, or financial advice',
        'Never share personal information about staff or other customers',
        'Never make promises about outcomes not authorized by the business',
        'Never engage in political, religious, or controversial discussions',
      ],
      escalationTriggers: [
        'Customer expresses anger or frustration beyond agent capability',
        'Request involves a complaint that needs management review',
        'Question is outside the agent\'s defined knowledge scope',
        'Customer explicitly asks to speak to a human',
      ],
      maxResponseTokens: 500,
      requireConfirmation: ['Booking appointments', 'Cancelling appointments'],
      dataPrivacy: [
        'Do not store or repeat credit card numbers',
        'Do not log passwords or sensitive credentials',
        'Minimize collection of personal information to what is necessary',
      ],
      fallbackMessage: 'I appreciate your question, but I\'m not able to help with that specific request. Let me connect you with our team who can assist you further.',
      operatingHoursOnly: false,
      rateLimiting: {
        maxMessagesPerMinute: 10,
        maxMessagesPerSession: 100,
      },
    },

    // Capabilities
    knowledgeSources: [],
    tools: [],
    channels: ['web_chat'],

    // Generated outputs
    systemPrompt: '',
    n8nWorkflowId: null,
    n8nWorkflowJson: null,

    ...overrides,
  };
}

/**
 * Validate an agent config. Returns { valid, errors }.
 */
export function validateAgentConfig(config) {
  const errors = [];

  if (!config.role) errors.push('Role is required');
  if (!config.industry) errors.push('Industry is required');
  if (!config.persona?.name) errors.push('Agent persona name is required');
  if (!config.persona?.tone) errors.push('Agent tone is required');
  if (!config.business?.name) errors.push('Business name is required');

  if (config.persona?.tone && !PERSONA_TONES.includes(config.persona.tone)) {
    errors.push(`Invalid tone: ${config.persona.tone}`);
  }

  if (config.channels?.length === 0) {
    errors.push('At least one deployment channel is required');
  }

  return { valid: errors.length === 0, errors };
}
