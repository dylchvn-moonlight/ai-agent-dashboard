# AI Agent Creator — Configuration Schema, Industry Templates & Kimi Integration

> **For Dylan's AI Agent UI — React Backend**
> Complete system for creating, configuring, and deploying industry-specific AI agents via n8n.

> **Implementation Status:** IMPLEMENTED (v0.5.0, 2026-02-27)
> - Config schema & defaults: `src/lib/agent-config.js`
> - Industry profiles (13): `src/lib/industry-profiles.js`
> - Role templates (10): `src/lib/role-templates.js`
> - Tool→n8n mappings (15): `src/lib/tool-mappings.js`
> - Knowledge sources (8): `src/lib/knowledge-sources.js`
> - Persona presets & smart defaults: `src/lib/persona-presets.js`
> - Agent config UI: `src/components/AgentConfigPanel.jsx` (6-tab panel)
> - System prompt preview: `src/components/SystemPromptPreview.jsx`
> - Prompt generator: `src/services/prompt-generator.js`
> - n8n workflow generator: `src/services/n8n-workflow-generator.js`
> - Kimi tools: `src/lib/kimi-tools.js` (12 function definitions + master system prompt)
> - Agent store extended: `src/stores/agent-store.js` (agentConfig field)
> - AgentCard tags: `src/components/AgentCard.jsx` (industry/role badges)

---

## Table of Contents

1. [Agent Configuration Schema (TypeScript)](#1-agent-configuration-schema)
2. [Industry Profiles — Complete Library](#2-industry-profiles)
3. [Role Templates](#3-role-templates)
4. [Knowledge Source Configurations](#4-knowledge-source-configurations)
5. [Tool Definitions (n8n Node Mappings)](#5-tool-definitions)
6. [Persona & Guardrails Config](#6-persona--guardrails-config)
7. [System Prompt Generator Logic](#7-system-prompt-generator-logic)
8. [Kimi 2.5 Tool Definitions (Function Calling)](#8-kimi-25-tool-definitions)
9. [Kimi 2.5 Master System Prompt](#9-kimi-25-master-system-prompt)
10. [React Integration — API Routes & Service Layer](#10-react-integration)

---

## 1. Agent Configuration Schema

This is the master TypeScript schema that powers your entire agent creator. Every agent your dashboard creates starts as one of these objects.

```typescript
// types/agentConfig.ts

export interface AgentConfig {
  // Identity
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'deployed' | 'active' | 'paused';

  // Core Configuration
  role: AgentRole;
  industry: IndustryProfile;
  business: BusinessDetails;
  persona: PersonaConfig;
  guardrails: GuardrailsConfig;

  // Capabilities
  knowledgeSources: KnowledgeSource[];
  tools: AgentTool[];
  channels: DeploymentChannel[];

  // Generated Outputs
  systemPrompt?: string;
  n8nWorkflowId?: string;
  n8nWorkflowJson?: object;
}

// ─── ROLE ────────────────────────────────────────────────
export type AgentRoleType =
  | 'receptionist'
  | 'lead_qualifier'
  | 'customer_support'
  | 'sales_assistant'
  | 'onboarding_agent'
  | 'content_generator'
  | 'data_collector'
  | 'appointment_scheduler'
  | 'faq_bot'
  | 'review_manager';

export interface AgentRole {
  type: AgentRoleType;
  primaryGoal: string;
  secondaryGoals: string[];
  kpis: string[];
}

// ─── INDUSTRY ────────────────────────────────────────────
export type IndustryType =
  | 'real_estate'
  | 'automotive'
  | 'trades'
  | 'medical_dental'
  | 'hospitality'
  | 'legal'
  | 'ecommerce'
  | 'fitness_wellness'
  | 'agency'
  | 'financial_services'
  | 'education'
  | 'construction'
  | 'custom';

export interface IndustryProfile {
  type: IndustryType;
  terminology: Record<string, string>;
  commonQuestions: string[];
  complianceRules: string[];
  dataTypes: string[];
  integrations: string[];
}

// ─── BUSINESS DETAILS ────────────────────────────────────
export interface BusinessDetails {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  operatingHours: OperatingHours;
  services: ServiceItem[];
  policies: string[];
  teamMembers?: TeamMember[];
}

export interface OperatingHours {
  timezone: string;
  schedule: {
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }[];
}

export interface ServiceItem {
  name: string;
  description: string;
  duration?: number;       // minutes
  price?: string;
  category?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  email?: string;
  specialties?: string[];
}

// ─── KNOWLEDGE SOURCES ───────────────────────────────────
export type KnowledgeSourceType =
  | 'business_sheet'
  | 'website_scrape'
  | 'document_upload'
  | 'api_endpoint'
  | 'vector_store'
  | 'google_sheets'
  | 'notion'
  | 'prompt_only';

export interface KnowledgeSource {
  type: KnowledgeSourceType;
  name: string;
  config: Record<string, any>;
  refreshInterval?: string;  // cron expression
}

// ─── TOOLS ───────────────────────────────────────────────
export type AgentToolType =
  | 'calendar'
  | 'email'
  | 'crm'
  | 'sms'
  | 'whatsapp'
  | 'webhook'
  | 'web_search'
  | 'calculator'
  | 'human_handoff'
  | 'document_lookup'
  | 'inventory_check'
  | 'booking_system'
  | 'payment_link'
  | 'form_builder'
  | 'slack_notify';

export interface AgentTool {
  type: AgentToolType;
  enabled: boolean;
  config: Record<string, any>;
  n8nNodeType: string;         // maps to n8n node
  credentialType?: string;     // maps to n8n credential
}

// ─── PERSONA ─────────────────────────────────────────────
export interface PersonaConfig {
  name: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal' | 'empathetic';
  language: string;
  responseLength: 'concise' | 'moderate' | 'detailed';
  greeting: string;
  signoff: string;
  personality: string[];       // e.g., ['helpful', 'patient', 'knowledgeable']
  avatarUrl?: string;
}

// ─── GUARDRAILS ──────────────────────────────────────────
export interface GuardrailsConfig {
  boundaries: string[];           // topics agent must NOT discuss
  escalationTriggers: string[];   // when to hand off to human
  maxResponseTokens: number;
  requireConfirmation: string[];  // actions needing user confirmation
  dataPrivacy: string[];          // PII handling rules
  fallbackMessage: string;        // when agent can't help
  operatingHoursOnly: boolean;
  rateLimiting: {
    maxMessagesPerMinute: number;
    maxMessagesPerSession: number;
  };
}

// ─── DEPLOYMENT ──────────────────────────────────────────
export type DeploymentChannel =
  | 'web_chat'
  | 'whatsapp'
  | 'telegram'
  | 'sms'
  | 'voice'
  | 'email'
  | 'slack'
  | 'api_endpoint';
```

---

## 2. Industry Profiles

Each industry profile provides the context that makes agents sound like they actually work in that field.

```typescript
// data/industryProfiles.ts

export const INDUSTRY_PROFILES: Record<IndustryType, IndustryProfile> = {

  // ═══════════════════════════════════════════════════════
  real_estate: {
    type: 'real_estate',
    terminology: {
      'listing': 'A property available for sale or rent',
      'open_home': 'Scheduled property viewing for potential buyers',
      'settlement': 'Final transfer of property ownership',
      'vendor': 'The property seller',
      'buyer_agent': 'Agent representing the buyer',
      'appraisal': 'Property value assessment',
      'pre_approval': 'Conditional loan approval from lender',
      'under_contract': 'Accepted offer, pending settlement',
      'auction': 'Public competitive bidding for property',
      'body_corporate': 'Owners corporation for units/apartments',
      'strata': 'Shared property management scheme',
      'LVR': 'Loan-to-value ratio',
    },
    commonQuestions: [
      'What properties do you have in [suburb]?',
      'When is the next open home for [address]?',
      'What is the price guide for [property]?',
      'Can I book a private inspection?',
      'What are the body corporate fees?',
      'Is the property under contract?',
      'What schools are nearby?',
      'Can you send me a contract for review?',
      'What is the settlement period?',
      'Do you handle property management as well?',
    ],
    complianceRules: [
      'Never guarantee property value increases',
      'Always disclose if acting for the vendor',
      'Do not provide financial advice — refer to a mortgage broker',
      'Include property disclaimers in written communications',
      'Comply with Real Estate and Business Agents Act',
      'Never discriminate based on protected characteristics',
    ],
    dataTypes: ['listings', 'contacts', 'inspections', 'offers', 'contracts'],
    integrations: ['REA/Domain API', 'CRM (AgentBox/VaultRE)', 'Google Calendar', 'DocuSign'],
  },

  // ═══════════════════════════════════════════════════════
  automotive: {
    type: 'automotive',
    terminology: {
      'test_drive': 'Scheduled vehicle evaluation drive',
      'trade_in': 'Customer\'s existing vehicle used as partial payment',
      'driveaway_price': 'Total cost including all on-road fees',
      'rego': 'Vehicle registration',
      'roadworthy': 'Safety inspection certificate (RWC)',
      'finance': 'Vehicle loan/lease arrangement',
      'service_booking': 'Scheduled vehicle maintenance appointment',
      'recall': 'Manufacturer-initiated safety repair',
      'demo_vehicle': 'Low-km dealer demonstration car',
      'fleet': 'Business/bulk vehicle purchase',
      'logbook_service': 'Manufacturer-specified maintenance schedule',
      'warranty': 'Manufacturer or dealer repair coverage',
    },
    commonQuestions: [
      'What [make/model] do you have in stock?',
      'Can I book a test drive?',
      'What is the driveaway price?',
      'Do you offer finance?',
      'What is my trade-in worth?',
      'When is my next service due?',
      'Can I book a service appointment?',
      'Is this vehicle still under warranty?',
      'Do you have any demo vehicles available?',
      'What are your opening hours?',
    ],
    complianceRules: [
      'Never misrepresent vehicle history or condition',
      'Always disclose known defects',
      'Do not provide binding finance quotes — refer to finance manager',
      'Include statutory warranty information',
      'Comply with Australian Consumer Law for vehicle sales',
      'Odometer tampering is illegal — never alter readings',
    ],
    dataTypes: ['inventory', 'customers', 'test_drives', 'service_bookings', 'trade_ins'],
    integrations: ['DMS (Dealer Management System)', 'Google Calendar', 'SMS/WhatsApp', 'Finance Broker API'],
  },

  // ═══════════════════════════════════════════════════════
  trades: {
    type: 'trades',
    terminology: {
      'quote': 'Written estimate for a job',
      'callout_fee': 'Charge for visiting the premises',
      'emergency_callout': 'Urgent out-of-hours service',
      'scope_of_work': 'Detailed description of job requirements',
      'compliance_cert': 'Certificate of compliance for completed work',
      'rough_in': 'Initial installation before finishing',
      'fit_off': 'Final installation and connection',
      'materials_list': 'Required parts and supplies for a job',
    },
    commonQuestions: [
      'Can I get a quote for [job description]?',
      'Do you offer emergency callouts?',
      'What is your callout fee?',
      'Are you licensed and insured?',
      'When is your next available appointment?',
      'Do you service my area?',
      'How long will the job take?',
      'Do you provide a warranty on your work?',
      'Can you provide a compliance certificate?',
      'What payment methods do you accept?',
    ],
    complianceRules: [
      'Always confirm licensing for regulated work (electrical, plumbing, gas)',
      'Never diagnose without proper inspection',
      'Provide written quotes for work over threshold',
      'Include warranty terms in all quotes',
      'Comply with relevant trade licensing requirements',
    ],
    dataTypes: ['jobs', 'quotes', 'customers', 'schedules', 'invoices'],
    integrations: ['Google Calendar', 'Xero/MYOB', 'SMS', 'ServiceM8/Tradify'],
  },

  // ═══════════════════════════════════════════════════════
  medical_dental: {
    type: 'medical_dental',
    terminology: {
      'appointment': 'Scheduled patient visit',
      'referral': 'Direction to a specialist from GP',
      'bulk_billing': 'Medicare covers full cost — no gap',
      'gap_fee': 'Out-of-pocket cost after Medicare/insurance',
      'consultation': 'Doctor/dentist examination',
      'recall': 'Scheduled follow-up or check-up reminder',
      'script': 'Prescription for medication',
      'imaging': 'X-rays, scans, or other diagnostic images',
    },
    commonQuestions: [
      'Can I book an appointment?',
      'Do you bulk bill?',
      'What is the gap fee?',
      'Is Dr [name] available on [day]?',
      'Can I get a repeat prescription?',
      'Do I need a referral?',
      'What are your opening hours?',
      'Do you offer telehealth appointments?',
      'How do I access my results?',
      'What should I bring to my first appointment?',
    ],
    complianceRules: [
      'NEVER provide medical diagnoses or treatment advice',
      'Always refer medical questions to qualified practitioners',
      'Protect patient privacy — never share patient details',
      'Comply with Privacy Act and health records legislation',
      'Do not confirm or deny patient attendance to third parties',
      'Store no personal health information in chat logs',
    ],
    dataTypes: ['appointments', 'practitioners', 'services', 'locations'],
    integrations: ['Practice Management Software', 'Google Calendar', 'SMS reminders', 'Medicare/Health fund APIs'],
  },

  // ═══════════════════════════════════════════════════════
  hospitality: {
    type: 'hospitality',
    terminology: {
      'reservation': 'Table or room booking',
      'covers': 'Number of guests for a table',
      'function': 'Private event or group booking',
      'BYO': 'Bring your own (alcohol policy)',
      'corkage': 'Fee for BYO alcohol',
      'degustation': 'Multi-course tasting menu',
      'high_tea': 'Afternoon tea service',
    },
    commonQuestions: [
      'Can I make a reservation for [number] people?',
      'Do you have availability on [date]?',
      'Can I see the menu?',
      'Do you cater for dietary requirements?',
      'Is there parking available?',
      'Do you have a function room?',
      'Are you BYO?',
      'What are your opening hours?',
      'Do you take walk-ins?',
      'Can I book for a large group?',
    ],
    complianceRules: [
      'Always ask about dietary requirements and allergies',
      'Never guarantee specific table locations unless policy allows',
      'Communicate cancellation policies upfront',
      'Comply with responsible service of alcohol guidelines',
    ],
    dataTypes: ['reservations', 'menus', 'events', 'reviews'],
    integrations: ['OpenTable/Resy', 'Google Calendar', 'POS System', 'Google Business'],
  },

  // ═══════════════════════════════════════════════════════
  legal: {
    type: 'legal',
    terminology: {
      'consultation': 'Initial meeting with lawyer',
      'retainer': 'Upfront fee to secure legal services',
      'brief': 'Summary of case facts and instructions',
      'discovery': 'Exchange of relevant documents between parties',
      'settlement': 'Resolution without going to trial',
      'caveat': 'Legal notice on property title',
      'conveyancing': 'Legal process of property transfer',
      'power_of_attorney': 'Legal authority to act on behalf of another',
    },
    commonQuestions: [
      'What areas of law do you practice?',
      'How much does a consultation cost?',
      'Can I book an initial consultation?',
      'Do you offer payment plans?',
      'How long will my case take?',
      'Do you handle [specific legal matter]?',
      'What documents do I need to bring?',
      'Are consultations confidential?',
    ],
    complianceRules: [
      'NEVER provide legal advice — only general information',
      'Always state that information is general and not legal advice',
      'Check for conflicts of interest before booking consultations',
      'Maintain strict client confidentiality',
      'Comply with Legal Profession Act requirements',
      'Do not guarantee case outcomes',
    ],
    dataTypes: ['matters', 'clients', 'appointments', 'documents'],
    integrations: ['Practice Management (LEAP/Clio)', 'Google Calendar', 'DocuSign', 'Email'],
  },

  // ═══════════════════════════════════════════════════════
  ecommerce: {
    type: 'ecommerce',
    terminology: {
      'SKU': 'Stock Keeping Unit — unique product identifier',
      'fulfillment': 'Process of packing and shipping orders',
      'RMA': 'Return Merchandise Authorization',
      'cart_abandonment': 'Customer leaves without completing purchase',
      'dropship': 'Supplier ships directly to customer',
      'AOV': 'Average Order Value',
    },
    commonQuestions: [
      'Where is my order?',
      'Can I return this item?',
      'Do you have [product] in stock?',
      'What is your return policy?',
      'How long does shipping take?',
      'Can I change my order?',
      'Do you offer express shipping?',
      'Is this product compatible with [X]?',
      'Can I get a refund?',
      'Do you have a discount code?',
    ],
    complianceRules: [
      'Always honor stated return policies',
      'Comply with Australian Consumer Law for refunds',
      'Never share customer payment details',
      'Provide tracking information when available',
      'Disclose shipping costs before checkout',
    ],
    dataTypes: ['orders', 'products', 'customers', 'returns', 'inventory'],
    integrations: ['Shopify/WooCommerce', 'Shipping APIs', 'Stripe', 'Inventory Management'],
  },

  // ═══════════════════════════════════════════════════════
  fitness_wellness: {
    type: 'fitness_wellness',
    terminology: {
      'PT_session': 'Personal training appointment',
      'class_booking': 'Group fitness class reservation',
      'membership': 'Gym/studio access plan',
      'assessment': 'Initial fitness evaluation',
      'program': 'Customized training plan',
    },
    commonQuestions: [
      'What memberships do you offer?',
      'Can I book a trial class?',
      'What is the class timetable?',
      'Do you offer personal training?',
      'What are your opening hours?',
      'Is there parking?',
      'Can I freeze my membership?',
      'What is your cancellation policy?',
    ],
    complianceRules: [
      'Never provide medical or dietary advice',
      'Refer health concerns to qualified professionals',
      'Communicate cancellation and freeze policies clearly',
      'Ensure informed consent for fitness assessments',
    ],
    dataTypes: ['members', 'classes', 'bookings', 'programs'],
    integrations: ['Mindbody/Glofox', 'Google Calendar', 'Stripe', 'SMS'],
  },

  // ═══════════════════════════════════════════════════════
  agency: {
    type: 'agency',
    terminology: {
      'brief': 'Client project requirements document',
      'scope': 'Defined boundaries of project work',
      'sprint': 'Time-boxed development cycle',
      'deliverable': 'Completed work product',
      'retainer': 'Ongoing monthly service agreement',
      'SOW': 'Statement of Work',
    },
    commonQuestions: [
      'What services do you offer?',
      'Can I get a quote for a website?',
      'What is your turnaround time?',
      'Do you offer ongoing support?',
      'Can I see your portfolio?',
      'What is your pricing structure?',
      'Do you offer SEO services?',
      'Can you redesign my existing site?',
    ],
    complianceRules: [
      'Provide clear scope before starting work',
      'Never promise specific SEO rankings',
      'Maintain client confidentiality',
      'Comply with intellectual property agreements',
    ],
    dataTypes: ['projects', 'clients', 'proposals', 'invoices'],
    integrations: ['Project Management', 'Google Workspace', 'Stripe', 'Slack'],
  },

  // ═══════════════════════════════════════════════════════
  financial_services: {
    type: 'financial_services',
    terminology: {
      'portfolio': 'Collection of investments',
      'superannuation': 'Retirement savings fund',
      'SMSF': 'Self-managed super fund',
      'CGT': 'Capital gains tax',
      'financial_plan': 'Comprehensive financial strategy document',
    },
    commonQuestions: [
      'Can I book a financial consultation?',
      'What services do you provide?',
      'Do you charge a fee for initial consultations?',
      'Can you help with tax planning?',
      'Do you manage super funds?',
    ],
    complianceRules: [
      'NEVER provide specific financial advice without AFSL',
      'Always include general advice disclaimer',
      'Refer to qualified financial advisers for specific advice',
      'Comply with ASIC and AFSL requirements',
      'Do not guarantee investment returns',
    ],
    dataTypes: ['clients', 'appointments', 'documents'],
    integrations: ['Xplan/Midwinter', 'Google Calendar', 'DocuSign'],
  },

  // ═══════════════════════════════════════════════════════
  education: {
    type: 'education',
    terminology: {
      'enrollment': 'Student registration for a course',
      'semester': 'Academic term period',
      'curriculum': 'Course content and structure',
      'assessment': 'Student evaluation method',
    },
    commonQuestions: [
      'What courses do you offer?',
      'How do I enroll?',
      'What are the fees?',
      'When does the next term start?',
      'Do you offer payment plans?',
      'Is this course accredited?',
    ],
    complianceRules: [
      'Protect student privacy',
      'Provide accurate accreditation information',
      'Comply with education sector regulations',
    ],
    dataTypes: ['courses', 'students', 'enrollments', 'schedules'],
    integrations: ['LMS', 'Google Calendar', 'Payment Gateway', 'Email'],
  },

  // ═══════════════════════════════════════════════════════
  construction: {
    type: 'construction',
    terminology: {
      'tender': 'Formal bid for a construction project',
      'variation': 'Change to original scope during build',
      'practical_completion': 'Build is substantially finished',
      'defects_period': 'Time after completion to fix issues',
      'site_inspection': 'Physical assessment of work progress',
    },
    commonQuestions: [
      'Can I get a quote for [project type]?',
      'Are you licensed and insured?',
      'What is your availability?',
      'How long will the build take?',
      'Do you handle council approvals?',
      'What is included in the contract?',
    ],
    complianceRules: [
      'Provide written contracts for all work',
      'Comply with Building Code and relevant standards',
      'Include cooling-off periods in domestic contracts',
      'Hold appropriate builder licensing',
    ],
    dataTypes: ['projects', 'quotes', 'schedules', 'invoices', 'inspections'],
    integrations: ['Project Management', 'Xero/MYOB', 'Google Calendar', 'SMS'],
  },

  // ═══════════════════════════════════════════════════════
  custom: {
    type: 'custom',
    terminology: {},
    commonQuestions: [],
    complianceRules: [],
    dataTypes: [],
    integrations: [],
  },
};
```

---

## 3. Role Templates

Each role defines what the agent does, its goals, and how it measures success.

```typescript
// data/roleTemplates.ts

export const ROLE_TEMPLATES: Record<AgentRoleType, AgentRole> = {

  receptionist: {
    type: 'receptionist',
    primaryGoal: 'Handle incoming inquiries, answer FAQs, and route or book appointments efficiently',
    secondaryGoals: [
      'Capture caller/visitor contact information',
      'Provide accurate business information',
      'Reduce wait times and missed calls',
      'Create a positive first impression',
    ],
    kpis: ['response_time', 'appointment_conversion', 'inquiry_resolution', 'customer_satisfaction'],
  },

  lead_qualifier: {
    type: 'lead_qualifier',
    primaryGoal: 'Capture, qualify, and score incoming leads based on defined criteria',
    secondaryGoals: [
      'Collect key qualifying information (budget, timeline, needs)',
      'Score leads as hot/warm/cold',
      'Route qualified leads to sales team immediately',
      'Nurture unqualified leads with follow-up sequences',
    ],
    kpis: ['leads_captured', 'qualification_rate', 'handoff_speed', 'lead_quality_score'],
  },

  customer_support: {
    type: 'customer_support',
    primaryGoal: 'Resolve customer issues quickly and escalate complex cases to humans',
    secondaryGoals: [
      'Answer common questions from knowledge base',
      'Track and log all support interactions',
      'Identify recurring issues for team awareness',
      'Maintain high customer satisfaction scores',
    ],
    kpis: ['resolution_rate', 'first_response_time', 'escalation_rate', 'csat_score'],
  },

  sales_assistant: {
    type: 'sales_assistant',
    primaryGoal: 'Guide prospects through the sales process and increase conversions',
    secondaryGoals: [
      'Recommend relevant products/services based on needs',
      'Handle common objections with approved responses',
      'Schedule demos/consultations for sales team',
      'Follow up with prospects who haven\'t converted',
    ],
    kpis: ['conversion_rate', 'demos_booked', 'revenue_influenced', 'engagement_rate'],
  },

  onboarding_agent: {
    type: 'onboarding_agent',
    primaryGoal: 'Guide new clients/users through setup and initial experience',
    secondaryGoals: [
      'Collect required onboarding information',
      'Walk through initial setup steps',
      'Answer getting-started questions',
      'Ensure completion of onboarding checklist',
    ],
    kpis: ['completion_rate', 'time_to_onboard', 'support_tickets_reduced', 'activation_rate'],
  },

  content_generator: {
    type: 'content_generator',
    primaryGoal: 'Create and schedule content based on business topics and brand voice',
    secondaryGoals: [
      'Generate social media posts, emails, and blog content',
      'Maintain consistent brand tone and messaging',
      'Optimize content for SEO where applicable',
      'Schedule content via connected platforms',
    ],
    kpis: ['content_pieces_created', 'engagement_rate', 'consistency_score', 'time_saved'],
  },

  data_collector: {
    type: 'data_collector',
    primaryGoal: 'Scrape, enrich, and organize business data from defined sources',
    secondaryGoals: [
      'Find and verify contact information',
      'Enrich existing records with additional data',
      'Deduplicate and clean datasets',
      'Deliver structured data to defined outputs',
    ],
    kpis: ['records_collected', 'data_accuracy', 'enrichment_rate', 'delivery_success'],
  },

  appointment_scheduler: {
    type: 'appointment_scheduler',
    primaryGoal: 'Manage appointment bookings, reschedules, and cancellations',
    secondaryGoals: [
      'Check real-time calendar availability',
      'Send confirmation and reminder messages',
      'Handle rescheduling and cancellation requests',
      'Reduce no-shows with automated reminders',
    ],
    kpis: ['bookings_made', 'no_show_rate', 'reschedule_rate', 'booking_conversion'],
  },

  faq_bot: {
    type: 'faq_bot',
    primaryGoal: 'Answer frequently asked questions accurately from a defined knowledge base',
    secondaryGoals: [
      'Reduce support team workload',
      'Provide instant 24/7 responses',
      'Log unanswered questions for knowledge base expansion',
      'Escalate complex queries to human support',
    ],
    kpis: ['questions_answered', 'accuracy_rate', 'deflection_rate', 'escalation_rate'],
  },

  review_manager: {
    type: 'review_manager',
    primaryGoal: 'Monitor, respond to, and generate customer reviews across platforms',
    secondaryGoals: [
      'Respond to reviews on Google/Facebook/industry platforms',
      'Send review requests to happy customers',
      'Flag negative reviews for immediate team attention',
      'Track review sentiment over time',
    ],
    kpis: ['reviews_generated', 'response_rate', 'average_rating', 'sentiment_score'],
  },
};
```

---

## 4. Knowledge Source Configurations

Maps each knowledge source type to its n8n implementation.

```typescript
// data/knowledgeSources.ts

export const KNOWLEDGE_SOURCE_CONFIGS: Record<KnowledgeSourceType, {
  description: string;
  n8nNodes: string[];
  setupSteps: string[];
  requiredCredentials: string[];
}> = {

  business_sheet: {
    description: 'Google Sheet containing business info, services, pricing, hours, and policies',
    n8nNodes: ['n8n-nodes-base.googleSheets'],
    setupSteps: [
      'Create a Google Sheet with tabs: Info, Services, Hours, Policies, FAQs',
      'Populate with business data',
      'Share sheet with n8n service account',
    ],
    requiredCredentials: ['googleSheetsOAuth2Api'],
  },

  website_scrape: {
    description: 'Automated scrape of client website for content, FAQs, and service info',
    n8nNodes: ['n8n-nodes-base.httpRequest'],
    setupSteps: [
      'Configure Firecrawl or similar scraping service',
      'Set target URLs for key pages (About, Services, FAQ, Contact)',
      'Schedule periodic refresh to keep data current',
    ],
    requiredCredentials: ['httpHeaderAuth'],
  },

  document_upload: {
    description: 'PDF/DOCX files uploaded as knowledge base for RAG retrieval',
    n8nNodes: [
      '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
      '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
      '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
    ],
    setupSteps: [
      'Upload documents to designated storage',
      'Configure vector store for embedding and retrieval',
      'Set up text splitter for chunking documents',
    ],
    requiredCredentials: ['openAiApi'],
  },

  api_endpoint: {
    description: 'Live API connection for real-time data (inventory, bookings, CRM)',
    n8nNodes: ['n8n-nodes-base.httpRequest'],
    setupSteps: [
      'Document API endpoints and authentication',
      'Create HTTP Request nodes for each endpoint',
      'Map response data to agent-readable format',
    ],
    requiredCredentials: ['httpHeaderAuth'],
  },

  vector_store: {
    description: 'Pinecone/Supabase vector database for semantic search over documents',
    n8nNodes: [
      '@n8n/n8n-nodes-langchain.vectorStorePinecone',
      '@n8n/n8n-nodes-langchain.retrievervectorstore',
    ],
    setupSteps: [
      'Set up Pinecone index or Supabase vector table',
      'Ingest and embed documents',
      'Configure retriever for semantic search',
    ],
    requiredCredentials: ['pineconeApi'],
  },

  google_sheets: {
    description: 'Live Google Sheet as dynamic data source (leads, inventory, pricing)',
    n8nNodes: ['n8n-nodes-base.googleSheets'],
    setupSteps: [
      'Connect Google Sheets credential',
      'Define sheet structure and columns',
      'Set read/write permissions',
    ],
    requiredCredentials: ['googleSheetsOAuth2Api'],
  },

  notion: {
    description: 'Notion database as knowledge base',
    n8nNodes: ['n8n-nodes-base.notion'],
    setupSteps: [
      'Connect Notion API credential',
      'Share relevant databases with integration',
      'Map database properties to agent context',
    ],
    requiredCredentials: ['notionApi'],
  },

  prompt_only: {
    description: 'All knowledge embedded directly in the system prompt — no external sources',
    n8nNodes: [],
    setupSteps: [
      'Compile all business information into the system prompt',
      'Keep prompt under token limits',
    ],
    requiredCredentials: [],
  },
};
```

---

## 5. Tool Definitions (n8n Node Mappings)

Maps each abstract tool to its concrete n8n implementation.

```typescript
// data/toolMappings.ts

export const TOOL_N8N_MAPPINGS: Record<AgentToolType, {
  description: string;
  n8nNodeType: string;
  n8nCredentialType: string;
  configTemplate: Record<string, any>;
}> = {

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
```

---

## 6. Persona & Guardrails Config

Default configurations per tone setting.

```typescript
// data/personaDefaults.ts

export const TONE_TEMPLATES: Record<PersonaConfig['tone'], {
  systemPromptModifier: string;
  exampleGreetings: string[];
  responseStyle: string;
}> = {

  professional: {
    systemPromptModifier: 'Maintain a polished, professional tone at all times. Use proper grammar and complete sentences. Be courteous but efficient. Avoid slang or overly casual language.',
    exampleGreetings: [
      'Good morning, thank you for contacting {business_name}. How may I assist you today?',
      'Welcome to {business_name}. I\'m {agent_name}, your virtual assistant. How can I help?',
    ],
    responseStyle: 'Structured, clear, complete sentences. No emojis. Formal closings.',
  },

  friendly: {
    systemPromptModifier: 'Be warm, approachable, and conversational while staying helpful and informative. Use a natural, easy-going tone that makes people feel welcome.',
    exampleGreetings: [
      'Hey there! Welcome to {business_name}. I\'m {agent_name} — what can I help you with today?',
      'Hi! Thanks for reaching out to {business_name}. How can I help?',
    ],
    responseStyle: 'Conversational, warm, natural. Occasional emojis OK. First-name basis.',
  },

  casual: {
    systemPromptModifier: 'Keep it relaxed and conversational, like chatting with a helpful friend. Short sentences, simple language, and a laid-back vibe.',
    exampleGreetings: [
      'Hey! What can I do for you today?',
      'Hi there! Need a hand with something?',
    ],
    responseStyle: 'Short, punchy, relaxed. Emojis welcome. Very conversational.',
  },

  formal: {
    systemPromptModifier: 'Use highly formal language appropriate for legal, financial, or executive communications. Maintain utmost professionalism and precision in every response.',
    exampleGreetings: [
      'Good day. Thank you for contacting {business_name}. I am {agent_name}, your virtual assistant. How may I be of service?',
    ],
    responseStyle: 'Formal, precise, no contractions. Respectful titles. No emojis.',
  },

  empathetic: {
    systemPromptModifier: 'Lead with empathy and understanding. Acknowledge feelings and concerns before providing solutions. Be patient, supportive, and reassuring.',
    exampleGreetings: [
      'Hi there, welcome to {business_name}. I\'m here to help — take your time and let me know what you need.',
    ],
    responseStyle: 'Warm, patient, understanding. Acknowledge emotions. Supportive language.',
  },
};

export const DEFAULT_GUARDRAILS: GuardrailsConfig = {
  boundaries: [
    'Never provide medical, legal, or financial advice',
    'Never share personal information about staff or other customers',
    'Never make promises about outcomes or guarantees not authorized by the business',
    'Never engage in political, religious, or controversial discussions',
    'Never process payments or handle sensitive financial information directly',
  ],
  escalationTriggers: [
    'Customer expresses anger or frustration beyond agent capability',
    'Request involves a complaint that needs management review',
    'Question is outside the agent\'s defined knowledge scope',
    'Customer explicitly asks to speak to a human',
    'Situation involves legal, safety, or compliance concerns',
  ],
  maxResponseTokens: 500,
  requireConfirmation: [
    'Booking appointments',
    'Cancelling appointments',
    'Sending information to third parties',
  ],
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
};
```

---

## 7. System Prompt Generator Logic

This function takes an AgentConfig and generates the complete system prompt.

```typescript
// services/promptGenerator.ts

export function generateSystemPrompt(config: AgentConfig): string {
  const { role, industry, business, persona, guardrails, tools, knowledgeSources } = config;
  const toneTemplate = TONE_TEMPLATES[persona.tone];

  const prompt = `
You are ${persona.name}, a ${role.type.replace('_', ' ')} for ${business.name}.

## YOUR IDENTITY
- Name: ${persona.name}
- Role: ${role.type.replace('_', ' ')}
- Business: ${business.name} (${industry.type.replace('_', ' ')})
- Location: ${business.address}
- Website: ${business.website}

## YOUR PRIMARY GOAL
${role.primaryGoal}

## SECONDARY GOALS
${role.secondaryGoals.map(g => `- ${g}`).join('\n')}

## COMMUNICATION STYLE
${toneTemplate.systemPromptModifier}
- Response length: ${persona.responseLength}
- Language: ${persona.language}
- Personality traits: ${persona.personality.join(', ')}

## GREETING
When someone first contacts you, greet them with:
"${persona.greeting.replace('{business_name}', business.name).replace('{agent_name}', persona.name)}"

## BUSINESS INFORMATION

### Operating Hours
${business.operatingHours.schedule.map(s =>
  s.closed ? `${s.day}: CLOSED` : `${s.day}: ${s.open} - ${s.close}`
).join('\n')}
Timezone: ${business.operatingHours.timezone}

### Services
${business.services.map(s =>
  `- ${s.name}${s.price ? ` ($${s.price})` : ''}${s.duration ? ` — ${s.duration} min` : ''}${s.description ? `: ${s.description}` : ''}`
).join('\n')}

### Policies
${business.policies.map(p => `- ${p}`).join('\n')}

${business.teamMembers && business.teamMembers.length > 0 ? `
### Team Members
${business.teamMembers.map(t =>
  `- ${t.name} (${t.role})${t.specialties ? ` — specializes in: ${t.specialties.join(', ')}` : ''}`
).join('\n')}
` : ''}

## INDUSTRY KNOWLEDGE

### Common Questions You Should Be Able To Answer
${industry.commonQuestions.map(q => `- ${q}`).join('\n')}

### Industry Terminology
${Object.entries(industry.terminology).map(([term, def]) =>
  `- **${term}**: ${def}`
).join('\n')}

## AVAILABLE TOOLS
You have access to the following tools to complete tasks:
${tools.filter(t => t.enabled).map(t => `- ${t.type.replace('_', ' ')}: ${TOOL_N8N_MAPPINGS[t.type].description}`).join('\n')}

## KNOWLEDGE SOURCES
You can access information from:
${knowledgeSources.map(ks => `- ${ks.name} (${ks.type.replace('_', ' ')})`).join('\n')}

## GUARDRAILS — YOU MUST FOLLOW THESE

### NEVER Do These Things
${guardrails.boundaries.map(b => `- ${b}`).join('\n')}

### Compliance Rules for ${industry.type.replace('_', ' ')}
${industry.complianceRules.map(r => `- ${r}`).join('\n')}

### Escalate to Human When
${guardrails.escalationTriggers.map(e => `- ${e}`).join('\n')}

### Require Confirmation Before
${guardrails.requireConfirmation.map(c => `- ${c}`).join('\n')}

### Data Privacy
${guardrails.dataPrivacy.map(d => `- ${d}`).join('\n')}

### When You Can't Help
If you cannot assist with a request, respond with:
"${guardrails.fallbackMessage}"

## RESPONSE FORMAT
- Keep responses ${persona.responseLength}
- Maximum response length: ${guardrails.maxResponseTokens} tokens
- Always stay in character as ${persona.name}
- Sign off with: "${persona.signoff}"
`.trim();

  return prompt;
}
```

---

## 8. Kimi 2.5 Tool Definitions (Function Calling)

These are the tools Kimi can call when generating and deploying agents.

```typescript
// services/kimiTools.ts

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
            description: 'The agent role type'
          },
          industry: {
            type: 'string',
            enum: ['real_estate', 'automotive', 'trades', 'medical_dental', 'hospitality', 'legal', 'ecommerce', 'fitness_wellness', 'agency', 'financial_services', 'education', 'construction', 'custom'],
            description: 'The industry this agent serves'
          },
          tools: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['calendar', 'email', 'crm', 'sms', 'whatsapp', 'webhook', 'web_search', 'calculator', 'human_handoff', 'document_lookup', 'inventory_check', 'booking_system', 'payment_link', 'slack_notify']
            },
            description: 'Tools the agent should have access to'
          },
          persona_tone: {
            type: 'string',
            enum: ['professional', 'friendly', 'casual', 'formal', 'empathetic'],
            description: 'Agent communication tone'
          },
          persona_name: { type: 'string', description: 'Agent character name' },
          knowledge_sources: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['business_sheet', 'website_scrape', 'document_upload', 'api_endpoint', 'vector_store', 'google_sheets', 'notion', 'prompt_only']
            },
            description: 'Where the agent gets its information'
          },
          channels: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['web_chat', 'whatsapp', 'telegram', 'sms', 'voice', 'email', 'slack', 'api_endpoint']
            },
            description: 'Where the agent will be deployed'
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
                duration: { type: 'number' }
              }
            },
            description: 'Services the business offers'
          },
        },
        required: ['name', 'role', 'industry', 'persona_tone', 'persona_name']
      }
    }
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
          agent_id: { type: 'string', description: 'The agent configuration ID' }
        },
        required: ['agent_id']
      }
    }
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
            description: 'How the workflow is triggered'
          },
        },
        required: ['agent_id']
      }
    }
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
          activate: { type: 'boolean', description: 'Whether to activate immediately' }
        },
        required: ['workflow_json']
      }
    }
  },

  // ─── n8n Management ────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description: 'List all workflows on the n8n instance.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_credentials',
      description: 'List all available credentials on the n8n instance.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'activate_workflow',
      description: 'Activate a deployed workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' }
        },
        required: ['workflow_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deactivate_workflow',
      description: 'Deactivate a deployed workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' }
        },
        required: ['workflow_id']
      }
    }
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
          confirmed: { type: 'boolean' }
        },
        required: ['workflow_id', 'confirmed']
      }
    }
  },

  // ─── Agent Library ─────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_industry_profiles',
      description: 'List all available industry profiles and their details.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_role_templates',
      description: 'List all available agent role templates.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_available_tools',
      description: 'List all tools an agent can use.',
      parameters: { type: 'object', properties: {} }
    }
  },
];
```

---

## 9. Kimi 2.5 Master System Prompt

This is the system prompt that goes into Kimi to power your agent creator.

```
You are the AI Agent Creator for Dylan's AI Agent UI Dashboard. You help design, configure, and deploy AI agents for various industries and use cases.

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
  - Output nodes (Sheets, Email, Slack, etc.)

Step 5 — DEPLOY using tool call: deploy_workflow
  - Show summary to user first
  - Deploy to n8n
  - Optionally activate

## AVAILABLE INDUSTRIES

real_estate | automotive | trades | medical_dental | hospitality | legal | ecommerce | fitness_wellness | agency | financial_services | education | construction | custom

Each has specific terminology, common questions, compliance rules, and typical integrations. Use the list_industry_profiles tool to access full details.

## AVAILABLE ROLES

receptionist | lead_qualifier | customer_support | sales_assistant | onboarding_agent | content_generator | data_collector | appointment_scheduler | faq_bot | review_manager

Each has a primary goal, secondary goals, and KPIs. Use the list_role_templates tool to access details.

## AVAILABLE TOOLS

calendar | email | crm | sms | whatsapp | webhook | web_search | calculator | human_handoff | document_lookup | inventory_check | booking_system | payment_link | slack_notify

Each maps to specific n8n nodes. Use list_available_tools for details.

## KNOWLEDGE SOURCES

business_sheet | website_scrape | document_upload | api_endpoint | vector_store | google_sheets | notion | prompt_only

## PERSONA TONES

professional | friendly | casual | formal | empathetic

## WHAT TO ASK THE USER

When creating an agent, collect:
1. What type of agent? (role)
2. What industry? 
3. Business name and basic details
4. What should the agent be able to DO? (tools)
5. How should it sound? (tone)
6. Where will it be deployed? (channel)
7. Any specific rules or boundaries?

If the user provides partial info, fill in smart defaults based on the industry and role, then confirm.

## SMART DEFAULTS

- Automotive receptionist → tools: calendar, email, crm, sms | tone: friendly | knowledge: business_sheet
- Real estate lead qualifier → tools: calendar, email, crm, web_search | tone: professional | knowledge: business_sheet, website_scrape
- Medical receptionist → tools: calendar, email, sms | tone: empathetic | knowledge: business_sheet | guardrails: strict medical compliance
- Trades appointment scheduler → tools: calendar, sms, crm | tone: friendly | knowledge: business_sheet
- E-commerce support → tools: web_search, crm, email | tone: friendly | knowledge: api_endpoint

## RESPONSE FORMAT

When presenting a configured agent, show:
- Agent Summary (name, role, industry, tone)
- Tools Enabled
- Knowledge Sources
- Key Guardrails
- System Prompt Preview (first 200 chars)
- Deployment Status

## COMMANDS

- "create agent" → Start agent creation flow
- "list agents" → Show deployed agents
- "list industries" → Show available industry profiles  
- "list roles" → Show available role templates
- "list tools" → Show available agent tools
- "update agent [id]" → Modify existing agent
- "deploy [id]" → Deploy agent to n8n
- "help" → Show available commands
```

---

## 10. React Integration

### API Route Structure

```
/api/agents/
  POST   /configure     → Create agent config
  GET    /list           → List all agents
  GET    /:id            → Get agent details
  PATCH  /:id            → Update agent config
  DELETE /:id            → Delete agent

/api/agents/:id/
  POST   /generate-prompt    → Generate system prompt
  POST   /generate-workflow  → Generate n8n workflow JSON
  POST   /deploy             → Deploy to n8n
  POST   /activate           → Activate on n8n
  POST   /deactivate         → Deactivate on n8n

/api/kimi/
  POST   /chat           → Send message to Kimi with tools
  
/api/n8n/
  GET    /workflows      → Proxy to n8n API
  GET    /credentials    → Proxy to n8n API
```

### Core Service — Kimi Integration

```typescript
// services/kimiService.ts

import OpenAI from 'openai';
import { KIMI_TOOLS } from './kimiTools';

const client = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.cn/v1',
});

export async function chatWithKimi(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
) {
  const response = await client.chat.completions.create({
    model: 'kimi-k2.5',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    tools: KIMI_TOOLS,
    tool_choice: 'auto',
    temperature: 0.6,
  });

  const choice = response.choices[0];

  // If Kimi wants to call a tool
  if (choice.message.tool_calls) {
    return {
      type: 'tool_call',
      toolCalls: choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
      message: choice.message,
    };
  }

  // Regular text response
  return {
    type: 'text',
    content: choice.message.content,
    message: choice.message,
  };
}
```

### Core Service — n8n API

```typescript
// services/n8nService.ts

const N8N_API_URL = process.env.N8N_API_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
};

export async function createWorkflow(workflowJson: object) {
  const res = await fetch(`${N8N_API_URL}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(workflowJson),
  });
  return res.json();
}

export async function activateWorkflow(id: string) {
  const res = await fetch(`${N8N_API_URL}/workflows/${id}/activate`, {
    method: 'POST',
    headers,
  });
  return res.json();
}

export async function deactivateWorkflow(id: string) {
  const res = await fetch(`${N8N_API_URL}/workflows/${id}/deactivate`, {
    method: 'POST',
    headers,
  });
  return res.json();
}

export async function listWorkflows() {
  const res = await fetch(`${N8N_API_URL}/workflows`, { headers });
  return res.json();
}

export async function listCredentials() {
  const res = await fetch(`${N8N_API_URL}/credentials`, { headers });
  return res.json();
}

export async function deleteWorkflow(id: string) {
  const res = await fetch(`${N8N_API_URL}/workflows/${id}`, {
    method: 'DELETE',
    headers,
  });
  return res.json();
}

export async function executeWorkflow(id: string) {
  const res = await fetch(`${N8N_API_URL}/workflows/${id}/run`, {
    method: 'POST',
    headers,
  });
  return res.json();
}
```

### Tool Call Handler

```typescript
// services/toolHandler.ts

import * as n8nService from './n8nService';
import * as agentStore from './agentStore';
import { generateSystemPrompt } from './promptGenerator';
import { generateWorkflowJson } from './workflowGenerator';
import { INDUSTRY_PROFILES } from '../data/industryProfiles';
import { ROLE_TEMPLATES } from '../data/roleTemplates';
import { TOOL_N8N_MAPPINGS } from '../data/toolMappings';

export async function handleToolCall(
  toolName: string,
  args: Record<string, any>
): Promise<string> {

  switch (toolName) {

    case 'configure_agent': {
      const config = buildAgentConfig(args);
      await agentStore.save(config);
      return JSON.stringify({
        success: true,
        agent_id: config.id,
        summary: {
          name: config.name,
          role: config.role.type,
          industry: config.industry.type,
          tools: config.tools.filter(t => t.enabled).map(t => t.type),
          tone: config.persona.tone,
        }
      });
    }

    case 'generate_system_prompt': {
      const config = await agentStore.get(args.agent_id);
      const prompt = generateSystemPrompt(config);
      config.systemPrompt = prompt;
      await agentStore.save(config);
      return JSON.stringify({
        success: true,
        prompt_preview: prompt.substring(0, 500) + '...',
        prompt_length: prompt.length,
      });
    }

    case 'generate_n8n_workflow': {
      const config = await agentStore.get(args.agent_id);
      const workflow = generateWorkflowJson(config, args.trigger_type || 'chat');
      config.n8nWorkflowJson = workflow;
      await agentStore.save(config);
      return JSON.stringify({
        success: true,
        node_count: workflow.nodes.length,
        trigger: args.trigger_type || 'chat',
        nodes: workflow.nodes.map((n: any) => n.name),
      });
    }

    case 'deploy_workflow': {
      const result = await n8nService.createWorkflow(args.workflow_json);
      if (args.activate) {
        await n8nService.activateWorkflow(result.id);
      }
      return JSON.stringify({
        success: true,
        workflow_id: result.id,
        active: args.activate || false,
        url: `${process.env.N8N_HOST}/workflow/${result.id}`,
      });
    }

    case 'list_workflows':
      return JSON.stringify(await n8nService.listWorkflows());

    case 'list_credentials':
      return JSON.stringify(await n8nService.listCredentials());

    case 'activate_workflow':
      return JSON.stringify(await n8nService.activateWorkflow(args.workflow_id));

    case 'deactivate_workflow':
      return JSON.stringify(await n8nService.deactivateWorkflow(args.workflow_id));

    case 'delete_workflow':
      if (!args.confirmed) return JSON.stringify({ error: 'Deletion requires confirmation' });
      return JSON.stringify(await n8nService.deleteWorkflow(args.workflow_id));

    case 'list_industry_profiles':
      return JSON.stringify(Object.keys(INDUSTRY_PROFILES).map(key => ({
        type: key,
        questionCount: INDUSTRY_PROFILES[key as IndustryType].commonQuestions.length,
        complianceRules: INDUSTRY_PROFILES[key as IndustryType].complianceRules.length,
        terminology: Object.keys(INDUSTRY_PROFILES[key as IndustryType].terminology).length,
      })));

    case 'list_role_templates':
      return JSON.stringify(Object.values(ROLE_TEMPLATES).map(r => ({
        type: r.type,
        primaryGoal: r.primaryGoal,
        kpis: r.kpis,
      })));

    case 'list_available_tools':
      return JSON.stringify(Object.entries(TOOL_N8N_MAPPINGS).map(([key, val]) => ({
        tool: key,
        description: val.description,
        n8nNode: val.n8nNodeType,
      })));

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
```

---

## Quick Reference — End-to-End Flow

```
1. User opens Agent Creator on dashboard
2. Selects from dropdowns/forms:
   - Role: Receptionist
   - Industry: Automotive  
   - Tools: Calendar, Email, CRM, SMS
   - Tone: Friendly
   - Business details: "Sunrise Motors"

3. Dashboard sends to Kimi 2.5 API with:
   - Master system prompt (Section 9)
   - Tool definitions (Section 8)
   - User's selections as message

4. Kimi calls: configure_agent → generate_system_prompt → generate_n8n_workflow

5. Each tool call is handled by toolHandler.ts:
   - configure_agent: builds AgentConfig from selections + industry profile
   - generate_system_prompt: assembles custom prompt with business + industry context
   - generate_n8n_workflow: creates complete n8n JSON with AI Agent + tools + memory

6. User reviews the summary → confirms deployment

7. Kimi calls: deploy_workflow → activate_workflow

8. Agent is LIVE on n8n, accessible via chat widget, webhook, or configured channel
```

---

*Built for Dylan's AI Agency — Agent Creator v1*  
*Last updated: February 2026*
