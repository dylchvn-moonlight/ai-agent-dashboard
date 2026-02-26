import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Building2, User, Wrench, Shield, BookOpen, Sparkles, ChevronDown,
  Plus, Trash2, Eye,
} from 'lucide-react';
import { INDUSTRY_PROFILES } from '@/lib/industry-profiles';
import { ROLE_TEMPLATES } from '@/lib/role-templates';
import { TOOL_N8N_MAPPINGS } from '@/lib/tool-mappings';
import { KNOWLEDGE_SOURCE_CONFIGS } from '@/lib/knowledge-sources';
import { TONE_TEMPLATES } from '@/lib/persona-presets';
import { DEPLOYMENT_CHANNELS, PERSONA_TONES, RESPONSE_LENGTHS } from '@/lib/agent-config';
import { getSmartDefaults } from '@/lib/persona-presets';
import SystemPromptPreview from './SystemPromptPreview';

const TABS = [
  { id: 'industry', label: 'Industry & Role', icon: Building2 },
  { id: 'persona', label: 'Persona', icon: User },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'guardrails', label: 'Guardrails', icon: Shield },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'preview', label: 'Preview', icon: Eye },
];

export default function AgentConfigPanel({ agentConfig, onChange, onClose }) {
  const [activeTab, setActiveTab] = useState('industry');

  const update = useCallback((path, value) => {
    const clone = JSON.parse(JSON.stringify(agentConfig));
    const keys = path.split('.');
    let target = clone;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    onChange(clone);
  }, [agentConfig, onChange]);

  return (
    <div className="flex flex-col h-full bg-[var(--sf)] border-l border-[var(--glassBd)]" style={{ width: 420 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glassBd)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--purple)]" />
          <span className="text-xs font-semibold text-[var(--hd)]">Agent Configuration</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[var(--dm)]">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--glassBd)] overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'text-[var(--blue)] border-[var(--blue)]'
                  : 'text-[var(--dm)] border-transparent hover:text-[var(--sb)]'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'industry' && (
          <IndustryTab agentConfig={agentConfig} update={update} />
        )}
        {activeTab === 'persona' && (
          <PersonaTab agentConfig={agentConfig} update={update} />
        )}
        {activeTab === 'tools' && (
          <ToolsTab agentConfig={agentConfig} update={update} />
        )}
        {activeTab === 'guardrails' && (
          <GuardrailsTab agentConfig={agentConfig} update={update} />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeTab agentConfig={agentConfig} update={update} />
        )}
        {activeTab === 'preview' && (
          <SystemPromptPreview agentConfig={agentConfig} />
        )}
      </div>
    </div>
  );
}

/* ─── SHARED UI COMPONENTS ─── */

function Label({ children }) {
  return <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">{children}</label>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dm)] pointer-events-none" />
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
    />
  );
}

/* ─── INDUSTRY & ROLE TAB ─── */

function IndustryTab({ agentConfig, update }) {
  const industryOptions = Object.values(INDUSTRY_PROFILES).map(p => ({
    value: p.type,
    label: `${p.icon} ${p.label}`,
  }));

  const roleOptions = Object.values(ROLE_TEMPLATES).map(r => ({
    value: r.type,
    label: `${r.icon} ${r.label}`,
  }));

  const channelOptions = DEPLOYMENT_CHANNELS.map(c => ({
    value: c,
    label: c.replace(/_/g, ' '),
  }));

  const handleIndustryChange = (val) => {
    update('industry', val);
    // Apply smart defaults if combo exists
    const role = agentConfig.role;
    if (role) {
      const defaults = getSmartDefaults(val, role);
      if (defaults) {
        applySmartDefaults(defaults, agentConfig, update);
      }
    }
  };

  const handleRoleChange = (val) => {
    update('role', val);
    const industry = agentConfig.industry;
    if (industry) {
      const defaults = getSmartDefaults(industry, val);
      if (defaults) {
        applySmartDefaults(defaults, agentConfig, update);
      }
    }
  };

  const selectedIndustry = agentConfig.industry ? INDUSTRY_PROFILES[agentConfig.industry] : null;
  const selectedRole = agentConfig.role ? ROLE_TEMPLATES[agentConfig.role] : null;

  return (
    <>
      <div>
        <Label>Industry</Label>
        <Select
          value={agentConfig.industry}
          onChange={handleIndustryChange}
          options={industryOptions}
          placeholder="Select industry..."
        />
        {selectedIndustry && selectedIndustry.type !== 'custom' && (
          <p className="text-[10px] text-[var(--dm)] mt-1">
            {selectedIndustry.commonQuestions?.length || 0} FAQs, {selectedIndustry.complianceRules?.length || 0} compliance rules, {Object.keys(selectedIndustry.terminology || {}).length} terms
          </p>
        )}
      </div>

      <div>
        <Label>Role</Label>
        <Select
          value={agentConfig.role}
          onChange={handleRoleChange}
          options={roleOptions}
          placeholder="Select role..."
        />
        {selectedRole && (
          <p className="text-[10px] text-[var(--dm)] mt-1">
            {selectedRole.primaryGoal}
          </p>
        )}
      </div>

      <div className="border-t border-[var(--glassBd)] pt-4">
        <Label>Business Details</Label>
        <div className="space-y-2">
          <TextInput value={agentConfig.business?.name} onChange={(v) => update('business.name', v)} placeholder="Business name" />
          <TextInput value={agentConfig.business?.address} onChange={(v) => update('business.address', v)} placeholder="Address" />
          <div className="grid grid-cols-2 gap-2">
            <TextInput value={agentConfig.business?.phone} onChange={(v) => update('business.phone', v)} placeholder="Phone" />
            <TextInput value={agentConfig.business?.email} onChange={(v) => update('business.email', v)} placeholder="Email" />
          </div>
          <TextInput value={agentConfig.business?.website} onChange={(v) => update('business.website', v)} placeholder="Website URL" />
        </div>
      </div>

      <div className="border-t border-[var(--glassBd)] pt-4">
        <Label>Deployment Channels</Label>
        <div className="flex flex-wrap gap-2">
          {channelOptions.map(ch => {
            const selected = (agentConfig.channels || []).includes(ch.value);
            return (
              <button
                key={ch.value}
                onClick={() => {
                  const channels = agentConfig.channels || [];
                  if (selected) {
                    update('channels', channels.filter(c => c !== ch.value));
                  } else {
                    update('channels', [...channels, ch.value]);
                  }
                }}
                className={`px-2.5 py-1 text-[10px] rounded-lg border transition-colors ${
                  selected
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'border-[var(--glassBd)] text-[var(--dm)] hover:text-[var(--sb)]'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── PERSONA TAB ─── */

function PersonaTab({ agentConfig, update }) {
  const persona = agentConfig.persona || {};

  const toneOptions = PERSONA_TONES.map(t => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }));

  const lengthOptions = RESPONSE_LENGTHS.map(l => ({
    value: l,
    label: l.charAt(0).toUpperCase() + l.slice(1),
  }));

  const selectedTone = TONE_TEMPLATES[persona.tone];

  return (
    <>
      <div>
        <Label>Agent Name</Label>
        <TextInput value={persona.name} onChange={(v) => update('persona.name', v)} placeholder="e.g., Alex, Sophie" />
      </div>

      <div>
        <Label>Tone</Label>
        <Select
          value={persona.tone}
          onChange={(v) => update('persona.tone', v)}
          options={toneOptions}
          placeholder="Select tone..."
        />
        {selectedTone && (
          <p className="text-[10px] text-[var(--dm)] mt-1">
            {selectedTone.responseStyle}
          </p>
        )}
      </div>

      <div>
        <Label>Response Length</Label>
        <Select
          value={persona.responseLength}
          onChange={(v) => update('persona.responseLength', v)}
          options={lengthOptions}
        />
      </div>

      <div>
        <Label>Language</Label>
        <TextInput value={persona.language} onChange={(v) => update('persona.language', v)} placeholder="English" />
      </div>

      <div>
        <Label>Greeting Message</Label>
        <TextArea
          value={persona.greeting}
          onChange={(v) => update('persona.greeting', v)}
          placeholder="Hi! Welcome to {business_name}. How can I help?"
          rows={2}
        />
        <p className="text-[10px] text-[var(--dm)] mt-0.5">Use {'{business_name}'} and {'{agent_name}'} as placeholders</p>
      </div>

      <div>
        <Label>Sign-off</Label>
        <TextInput
          value={persona.signoff}
          onChange={(v) => update('persona.signoff', v)}
          placeholder="Thanks for chatting!"
        />
      </div>

      <div>
        <Label>Personality Traits</Label>
        <TextInput
          value={(persona.personality || []).join(', ')}
          onChange={(v) => update('persona.personality', v.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="helpful, patient, knowledgeable"
        />
        <p className="text-[10px] text-[var(--dm)] mt-0.5">Comma-separated traits</p>
      </div>

      {selectedTone?.exampleGreetings?.length > 0 && (
        <div className="border-t border-[var(--glassBd)] pt-3">
          <Label>Example Greetings for "{persona.tone}" tone</Label>
          <div className="space-y-1">
            {selectedTone.exampleGreetings.map((g, i) => (
              <button
                key={i}
                onClick={() => update('persona.greeting', g)}
                className="block w-full text-left text-[10px] text-[var(--dm)] hover:text-[var(--tx)] px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                "{g}"
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── TOOLS TAB ─── */

function ToolsTab({ agentConfig, update }) {
  const tools = agentConfig.tools || [];
  const allToolTypes = Object.keys(TOOL_N8N_MAPPINGS);

  const toggleTool = (toolType) => {
    const existing = tools.find(t => t.type === toolType);
    if (existing) {
      update('tools', tools.map(t =>
        t.type === toolType ? { ...t, enabled: !t.enabled } : t
      ));
    } else {
      const mapping = TOOL_N8N_MAPPINGS[toolType];
      update('tools', [...tools, {
        type: toolType,
        enabled: true,
        config: {},
        n8nNodeType: mapping.n8nNodeType,
        credentialType: mapping.n8nCredentialType,
      }]);
    }
  };

  return (
    <>
      <p className="text-[10px] text-[var(--dm)]">
        Select tools your agent can use. Each maps to an n8n node in the generated workflow.
      </p>
      <div className="space-y-1.5">
        {allToolTypes.map(toolType => {
          const mapping = TOOL_N8N_MAPPINGS[toolType];
          const existing = tools.find(t => t.type === toolType);
          const enabled = existing?.enabled || false;

          return (
            <button
              key={toolType}
              onClick={() => toggleTool(toolType)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                enabled
                  ? 'bg-blue-500/5 border-blue-500/30'
                  : 'border-[var(--glassBd)] hover:border-[var(--sb)]/30'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                enabled ? 'border-[var(--blue)] bg-[var(--blue)]' : 'border-[var(--dm)]'
              }`}>
                {enabled && <span className="text-white text-[8px] font-bold">&#10003;</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--tx)]">
                  {toolType.replace(/_/g, ' ')}
                </p>
                <p className="text-[10px] text-[var(--dm)] truncate">{mapping.description}</p>
              </div>
              {mapping.n8nCredentialType && (
                <span className="text-[9px] text-[var(--dm)] bg-[var(--glass)] px-1.5 py-0.5 rounded shrink-0">
                  cred
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ─── GUARDRAILS TAB ─── */

function GuardrailsTab({ agentConfig, update }) {
  const guardrails = agentConfig.guardrails || {};

  const updateList = (field, index, value) => {
    const list = [...(guardrails[field] || [])];
    list[index] = value;
    update(`guardrails.${field}`, list);
  };

  const addToList = (field) => {
    const list = [...(guardrails[field] || []), ''];
    update(`guardrails.${field}`, list);
  };

  const removeFromList = (field, index) => {
    const list = (guardrails[field] || []).filter((_, i) => i !== index);
    update(`guardrails.${field}`, list);
  };

  return (
    <>
      <EditableList
        label="Boundaries (Never Do)"
        items={guardrails.boundaries || []}
        onUpdate={(i, v) => updateList('boundaries', i, v)}
        onAdd={() => addToList('boundaries')}
        onRemove={(i) => removeFromList('boundaries', i)}
        placeholder="Never provide..."
      />

      <EditableList
        label="Escalation Triggers"
        items={guardrails.escalationTriggers || []}
        onUpdate={(i, v) => updateList('escalationTriggers', i, v)}
        onAdd={() => addToList('escalationTriggers')}
        onRemove={(i) => removeFromList('escalationTriggers', i)}
        placeholder="Escalate when..."
      />

      <EditableList
        label="Require Confirmation Before"
        items={guardrails.requireConfirmation || []}
        onUpdate={(i, v) => updateList('requireConfirmation', i, v)}
        onAdd={() => addToList('requireConfirmation')}
        onRemove={(i) => removeFromList('requireConfirmation', i)}
        placeholder="Booking..."
      />

      <EditableList
        label="Data Privacy Rules"
        items={guardrails.dataPrivacy || []}
        onUpdate={(i, v) => updateList('dataPrivacy', i, v)}
        onAdd={() => addToList('dataPrivacy')}
        onRemove={(i) => removeFromList('dataPrivacy', i)}
        placeholder="Do not store..."
      />

      <div>
        <Label>Fallback Message</Label>
        <TextArea
          value={guardrails.fallbackMessage}
          onChange={(v) => update('guardrails.fallbackMessage', v)}
          placeholder="I can't help with that..."
          rows={2}
        />
      </div>

      <div>
        <Label>Max Response Tokens</Label>
        <TextInput
          type="number"
          value={guardrails.maxResponseTokens}
          onChange={(v) => update('guardrails.maxResponseTokens', parseInt(v) || 500)}
          placeholder="500"
        />
      </div>
    </>
  );
}

function EditableList({ label, items, onUpdate, onAdd, onRemove, placeholder }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>{label}</Label>
        <button
          onClick={onAdd}
          className="flex items-center gap-0.5 text-[10px] text-[var(--blue)] hover:text-blue-400 transition-colors"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-[var(--bg)] border border-[var(--glassBd)] rounded text-[10px] text-[var(--tx)] px-2 py-1.5 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
            <button
              onClick={() => onRemove(i)}
              className="p-1 text-[var(--dm)] hover:text-[var(--red)] transition-colors"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── KNOWLEDGE TAB ─── */

function KnowledgeTab({ agentConfig, update }) {
  const sources = agentConfig.knowledgeSources || [];
  const allTypes = Object.keys(KNOWLEDGE_SOURCE_CONFIGS);

  const toggleSource = (sourceType) => {
    const existing = sources.find(s => s.type === sourceType);
    if (existing) {
      update('knowledgeSources', sources.filter(s => s.type !== sourceType));
    } else {
      const config = KNOWLEDGE_SOURCE_CONFIGS[sourceType];
      update('knowledgeSources', [...sources, {
        type: sourceType,
        name: config.label,
        config: {},
      }]);
    }
  };

  return (
    <>
      <p className="text-[10px] text-[var(--dm)]">
        Select where your agent gets its knowledge from.
      </p>
      <div className="space-y-1.5">
        {allTypes.map(sourceType => {
          const config = KNOWLEDGE_SOURCE_CONFIGS[sourceType];
          const selected = sources.some(s => s.type === sourceType);

          return (
            <button
              key={sourceType}
              onClick={() => toggleSource(sourceType)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                selected
                  ? 'bg-purple-500/5 border-purple-500/30'
                  : 'border-[var(--glassBd)] hover:border-[var(--sb)]/30'
              }`}
            >
              <span className="text-sm mt-0.5">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--tx)]">{config.label}</p>
                <p className="text-[10px] text-[var(--dm)] line-clamp-2">{config.description}</p>
              </div>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 ${
                selected ? 'border-[var(--purple)] bg-[var(--purple)]' : 'border-[var(--dm)]'
              }`}>
                {selected && <span className="text-white text-[8px] font-bold">&#10003;</span>}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ─── HELPERS ─── */

function applySmartDefaults(defaults, agentConfig, update) {
  // Apply tone
  if (defaults.tone && !agentConfig.persona?.tone) {
    update('persona.tone', defaults.tone);
  }
  // Apply tools if none selected
  if (defaults.tools && (!agentConfig.tools || agentConfig.tools.length === 0)) {
    const tools = defaults.tools.map(toolType => ({
      type: toolType,
      enabled: true,
      config: {},
      n8nNodeType: TOOL_N8N_MAPPINGS[toolType]?.n8nNodeType || '',
      credentialType: TOOL_N8N_MAPPINGS[toolType]?.n8nCredentialType || '',
    }));
    update('tools', tools);
  }
  // Apply knowledge sources if none selected
  if (defaults.knowledge && (!agentConfig.knowledgeSources || agentConfig.knowledgeSources.length === 0)) {
    const sources = defaults.knowledge.map(ksType => ({
      type: ksType,
      name: KNOWLEDGE_SOURCE_CONFIGS[ksType]?.label || ksType,
      config: {},
    }));
    update('knowledgeSources', sources);
  }
}
