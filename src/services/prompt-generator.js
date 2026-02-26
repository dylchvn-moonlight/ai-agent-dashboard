// prompt-generator.js — Takes AgentConfig → generates complete system prompt
import { TONE_TEMPLATES } from '@/lib/persona-presets';
import { TOOL_N8N_MAPPINGS } from '@/lib/tool-mappings';
import { INDUSTRY_PROFILES } from '@/lib/industry-profiles';
import { ROLE_TEMPLATES } from '@/lib/role-templates';

/**
 * Generate a complete system prompt from an agent configuration.
 * @param {object} agentConfig - The full agent config object
 * @returns {string} The generated system prompt
 */
export function generateSystemPrompt(agentConfig) {
  const { role, industry, business, persona, guardrails, tools, knowledgeSources } = agentConfig;

  // Resolve the full profile/template objects if only type strings were passed
  const industryProfile = typeof industry === 'string' ? INDUSTRY_PROFILES[industry] : (industry || {});
  const roleTemplate = typeof role === 'string' ? ROLE_TEMPLATES[role] : (role || {});
  const toneTemplate = TONE_TEMPLATES[persona?.tone] || TONE_TEMPLATES.friendly;

  const sections = [];

  // --- Identity ---
  sections.push(`You are ${persona?.name || 'an AI assistant'}, a ${(roleTemplate.type || role || 'assistant').replace(/_/g, ' ')} for ${business?.name || 'the business'}.`);

  sections.push(`## YOUR IDENTITY
- Name: ${persona?.name || 'AI Assistant'}
- Role: ${(roleTemplate.type || role || 'assistant').replace(/_/g, ' ')}
- Business: ${business?.name || 'N/A'} (${(industryProfile.type || industry || 'general').replace(/_/g, ' ')})
- Location: ${business?.address || 'N/A'}
- Website: ${business?.website || 'N/A'}`);

  // --- Primary Goal ---
  if (roleTemplate.primaryGoal) {
    sections.push(`## YOUR PRIMARY GOAL
${roleTemplate.primaryGoal}`);
  }

  // --- Secondary Goals ---
  if (roleTemplate.secondaryGoals?.length) {
    sections.push(`## SECONDARY GOALS
${roleTemplate.secondaryGoals.map(g => `- ${g}`).join('\n')}`);
  }

  // --- Communication Style ---
  sections.push(`## COMMUNICATION STYLE
${toneTemplate.systemPromptModifier}
- Response length: ${persona?.responseLength || 'moderate'}
- Language: ${persona?.language || 'English'}${persona?.personality?.length ? `\n- Personality traits: ${persona.personality.join(', ')}` : ''}`);

  // --- Greeting ---
  if (persona?.greeting) {
    const greeting = persona.greeting
      .replace(/\{business_name\}/g, business?.name || '')
      .replace(/\{agent_name\}/g, persona?.name || '');
    sections.push(`## GREETING
When someone first contacts you, greet them with:
"${greeting}"`);
  }

  // --- Business Information ---
  if (business?.name) {
    let bizSection = '## BUSINESS INFORMATION\n';

    // Operating Hours
    if (business.operatingHours?.schedule?.length) {
      bizSection += '\n### Operating Hours\n';
      bizSection += business.operatingHours.schedule.map(s =>
        s.closed ? `${s.day}: CLOSED` : `${s.day}: ${s.open} - ${s.close}`
      ).join('\n');
      if (business.operatingHours.timezone) {
        bizSection += `\nTimezone: ${business.operatingHours.timezone}`;
      }
    }

    // Services
    if (business.services?.length) {
      bizSection += '\n\n### Services\n';
      bizSection += business.services.map(s =>
        `- ${s.name}${s.price ? ` ($${s.price})` : ''}${s.duration ? ` — ${s.duration} min` : ''}${s.description ? `: ${s.description}` : ''}`
      ).join('\n');
    }

    // Policies
    if (business.policies?.length) {
      bizSection += '\n\n### Policies\n';
      bizSection += business.policies.map(p => `- ${p}`).join('\n');
    }

    // Team Members
    if (business.teamMembers?.length) {
      bizSection += '\n\n### Team Members\n';
      bizSection += business.teamMembers.map(t =>
        `- ${t.name} (${t.role})${t.specialties?.length ? ` — specializes in: ${t.specialties.join(', ')}` : ''}`
      ).join('\n');
    }

    sections.push(bizSection);
  }

  // --- Industry Knowledge ---
  if (industryProfile.commonQuestions?.length || Object.keys(industryProfile.terminology || {}).length) {
    let industrySection = '## INDUSTRY KNOWLEDGE\n';

    if (industryProfile.commonQuestions?.length) {
      industrySection += '\n### Common Questions You Should Be Able To Answer\n';
      industrySection += industryProfile.commonQuestions.map(q => `- ${q}`).join('\n');
    }

    if (Object.keys(industryProfile.terminology || {}).length) {
      industrySection += '\n\n### Industry Terminology\n';
      industrySection += Object.entries(industryProfile.terminology).map(([term, def]) =>
        `- **${term}**: ${def}`
      ).join('\n');
    }

    sections.push(industrySection);
  }

  // --- Available Tools ---
  const enabledTools = (tools || []).filter(t => t.enabled);
  if (enabledTools.length) {
    sections.push(`## AVAILABLE TOOLS
You have access to the following tools to complete tasks:
${enabledTools.map(t => {
  const mapping = TOOL_N8N_MAPPINGS[t.type];
  return `- ${t.type.replace(/_/g, ' ')}: ${mapping?.description || 'Tool'}`;
}).join('\n')}`);
  }

  // --- Knowledge Sources ---
  if (knowledgeSources?.length) {
    sections.push(`## KNOWLEDGE SOURCES
You can access information from:
${knowledgeSources.map(ks => `- ${ks.name || ks.type} (${(ks.type || '').replace(/_/g, ' ')})`).join('\n')}`);
  }

  // --- Guardrails ---
  if (guardrails) {
    let guardrailSection = '## GUARDRAILS — YOU MUST FOLLOW THESE\n';

    if (guardrails.boundaries?.length) {
      guardrailSection += '\n### NEVER Do These Things\n';
      guardrailSection += guardrails.boundaries.map(b => `- ${b}`).join('\n');
    }

    if (industryProfile.complianceRules?.length) {
      guardrailSection += `\n\n### Compliance Rules for ${(industryProfile.type || '').replace(/_/g, ' ')}\n`;
      guardrailSection += industryProfile.complianceRules.map(r => `- ${r}`).join('\n');
    }

    if (guardrails.escalationTriggers?.length) {
      guardrailSection += '\n\n### Escalate to Human When\n';
      guardrailSection += guardrails.escalationTriggers.map(e => `- ${e}`).join('\n');
    }

    if (guardrails.requireConfirmation?.length) {
      guardrailSection += '\n\n### Require Confirmation Before\n';
      guardrailSection += guardrails.requireConfirmation.map(c => `- ${c}`).join('\n');
    }

    if (guardrails.dataPrivacy?.length) {
      guardrailSection += '\n\n### Data Privacy\n';
      guardrailSection += guardrails.dataPrivacy.map(d => `- ${d}`).join('\n');
    }

    if (guardrails.fallbackMessage) {
      guardrailSection += `\n\n### When You Can't Help
If you cannot assist with a request, respond with:
"${guardrails.fallbackMessage}"`;
    }

    sections.push(guardrailSection);
  }

  // --- Response Format ---
  sections.push(`## RESPONSE FORMAT
- Keep responses ${persona?.responseLength || 'moderate'}
- Maximum response length: ${guardrails?.maxResponseTokens || 500} tokens
- Always stay in character as ${persona?.name || 'the assistant'}${persona?.signoff ? `\n- Sign off with: "${persona.signoff}"` : ''}`);

  return sections.join('\n\n').trim();
}
