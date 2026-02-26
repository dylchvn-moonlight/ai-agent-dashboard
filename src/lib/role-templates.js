// role-templates.js — All 10 agent role templates

export const ROLE_TEMPLATES = {
  receptionist: {
    type: 'receptionist',
    label: 'Receptionist',
    icon: '📞',
    primaryGoal: 'Handle incoming inquiries, answer FAQs, and route or book appointments efficiently',
    secondaryGoals: [
      'Capture caller/visitor contact information',
      'Provide accurate business information',
      'Reduce wait times and missed calls',
      'Create a positive first impression',
    ],
    kpis: ['response_time', 'appointment_conversion', 'inquiry_resolution', 'customer_satisfaction'],
    defaultTools: ['calendar', 'email', 'crm', 'sms'],
  },

  lead_qualifier: {
    type: 'lead_qualifier',
    label: 'Lead Qualifier',
    icon: '🎯',
    primaryGoal: 'Capture, qualify, and score incoming leads based on defined criteria',
    secondaryGoals: [
      'Collect key qualifying information (budget, timeline, needs)',
      'Score leads as hot/warm/cold',
      'Route qualified leads to sales team immediately',
      'Nurture unqualified leads with follow-up sequences',
    ],
    kpis: ['leads_captured', 'qualification_rate', 'handoff_speed', 'lead_quality_score'],
    defaultTools: ['crm', 'email', 'calendar', 'web_search'],
  },

  customer_support: {
    type: 'customer_support',
    label: 'Customer Support',
    icon: '🛟',
    primaryGoal: 'Resolve customer issues quickly and escalate complex cases to humans',
    secondaryGoals: [
      'Answer common questions from knowledge base',
      'Track and log all support interactions',
      'Identify recurring issues for team awareness',
      'Maintain high customer satisfaction scores',
    ],
    kpis: ['resolution_rate', 'first_response_time', 'escalation_rate', 'csat_score'],
    defaultTools: ['email', 'crm', 'human_handoff', 'document_lookup'],
  },

  sales_assistant: {
    type: 'sales_assistant',
    label: 'Sales Assistant',
    icon: '💼',
    primaryGoal: 'Guide prospects through the sales process and increase conversions',
    secondaryGoals: [
      'Recommend relevant products/services based on needs',
      'Handle common objections with approved responses',
      'Schedule demos/consultations for sales team',
      'Follow up with prospects who haven\'t converted',
    ],
    kpis: ['conversion_rate', 'demos_booked', 'revenue_influenced', 'engagement_rate'],
    defaultTools: ['calendar', 'email', 'crm', 'calculator', 'payment_link'],
  },

  onboarding_agent: {
    type: 'onboarding_agent',
    label: 'Onboarding Agent',
    icon: '🚀',
    primaryGoal: 'Guide new clients/users through setup and initial experience',
    secondaryGoals: [
      'Collect required onboarding information',
      'Walk through initial setup steps',
      'Answer getting-started questions',
      'Ensure completion of onboarding checklist',
    ],
    kpis: ['completion_rate', 'time_to_onboard', 'support_tickets_reduced', 'activation_rate'],
    defaultTools: ['email', 'crm', 'form_builder', 'document_lookup'],
  },

  content_generator: {
    type: 'content_generator',
    label: 'Content Generator',
    icon: '✍️',
    primaryGoal: 'Create and schedule content based on business topics and brand voice',
    secondaryGoals: [
      'Generate social media posts, emails, and blog content',
      'Maintain consistent brand tone and messaging',
      'Optimize content for SEO where applicable',
      'Schedule content via connected platforms',
    ],
    kpis: ['content_pieces_created', 'engagement_rate', 'consistency_score', 'time_saved'],
    defaultTools: ['web_search', 'email', 'webhook'],
  },

  data_collector: {
    type: 'data_collector',
    label: 'Data Collector',
    icon: '📊',
    primaryGoal: 'Scrape, enrich, and organize business data from defined sources',
    secondaryGoals: [
      'Find and verify contact information',
      'Enrich existing records with additional data',
      'Deduplicate and clean datasets',
      'Deliver structured data to defined outputs',
    ],
    kpis: ['records_collected', 'data_accuracy', 'enrichment_rate', 'delivery_success'],
    defaultTools: ['web_search', 'crm', 'webhook'],
  },

  appointment_scheduler: {
    type: 'appointment_scheduler',
    label: 'Appointment Scheduler',
    icon: '📅',
    primaryGoal: 'Manage appointment bookings, reschedules, and cancellations',
    secondaryGoals: [
      'Check real-time calendar availability',
      'Send confirmation and reminder messages',
      'Handle rescheduling and cancellation requests',
      'Reduce no-shows with automated reminders',
    ],
    kpis: ['bookings_made', 'no_show_rate', 'reschedule_rate', 'booking_conversion'],
    defaultTools: ['calendar', 'sms', 'email', 'crm'],
  },

  faq_bot: {
    type: 'faq_bot',
    label: 'FAQ Bot',
    icon: '❓',
    primaryGoal: 'Answer frequently asked questions accurately from a defined knowledge base',
    secondaryGoals: [
      'Reduce support team workload',
      'Provide instant 24/7 responses',
      'Log unanswered questions for knowledge base expansion',
      'Escalate complex queries to human support',
    ],
    kpis: ['questions_answered', 'accuracy_rate', 'deflection_rate', 'escalation_rate'],
    defaultTools: ['document_lookup', 'human_handoff', 'email'],
  },

  review_manager: {
    type: 'review_manager',
    label: 'Review Manager',
    icon: '⭐',
    primaryGoal: 'Monitor, respond to, and generate customer reviews across platforms',
    secondaryGoals: [
      'Respond to reviews on Google/Facebook/industry platforms',
      'Send review requests to happy customers',
      'Flag negative reviews for immediate team attention',
      'Track review sentiment over time',
    ],
    kpis: ['reviews_generated', 'response_rate', 'average_rating', 'sentiment_score'],
    defaultTools: ['email', 'sms', 'crm', 'slack_notify'],
  },
};
