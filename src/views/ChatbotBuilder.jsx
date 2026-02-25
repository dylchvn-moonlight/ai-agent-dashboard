import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Building2,
  BookOpen,
  Sliders,
  Palette,
  Eye,
  Plus,
  Trash2,
  Send,
  Bot,
  User,
  ChevronDown,
  Sparkles,
  Package,
  HelpCircle,
  Save,
  FolderOpen,
  X,
  Brain,
} from 'lucide-react';
import useChatbotStore from '@/stores/chatbot-store';
import { generateSystemPrompt, configToAgentFlow } from '@/lib/chatbot-template';
import { generateWidget } from '@/lib/widget-generator';
import useAgentStore from '@/stores/agent-store';
import useUiStore from '@/stores/ui-store';
import { toast } from 'sonner';

const LLM_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'kimi', label: 'Kimi (Moonshot)' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'local', label: 'Local / Custom' },
];

/* ─── Reusable section wrapper ─── */
function Section({ icon: Icon, title, children, tourId }) {
  return (
    <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-5" data-tour={tourId}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--blue)]" />
        <h2 className="text-sm font-semibold text-[var(--hd)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─── Reusable input ─── */
function Field({ label, value, onChange, placeholder, type = 'text', rows }) {
  const cls =
    'w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-3 py-2 text-sm text-[var(--tx)] placeholder:text-[var(--dm)] focus:outline-none focus:ring-1 focus:ring-blue-500/40';
  return (
    <label className="block">
      <span className="text-xs font-medium text-[var(--sb)] mb-1 block">{label}</span>
      {rows ? (
        <textarea className={cls} value={value} onChange={onChange} placeholder={placeholder} rows={rows} />
      ) : (
        <input className={cls} type={type} value={value} onChange={onChange} placeholder={placeholder} />
      )}
    </label>
  );
}

/* ─── Tone selector ─── */
const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'casual', label: 'Casual' },
  { id: 'formal', label: 'Formal' },
];

/* ─── Position options ─── */
const POSITIONS = [
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
];

/* ─── Avatar emoji options ─── */
const AVATARS = ['🤖', '💬', '🧠', '⚡', '🎯', '🌟', '🔮', '🛟'];

/* ═════════════════════════════════════════════════════════════════ */
export default function ChatbotBuilder() {
  const configs = useChatbotStore((s) => s.configs);
  const activeConfigId = useChatbotStore((s) => s.activeConfigId);
  const createConfig = useChatbotStore((s) => s.createConfig);
  const updateConfig = useChatbotStore((s) => s.updateConfig);
  const deleteConfig = useChatbotStore((s) => s.deleteConfig);
  const setActiveConfig = useChatbotStore((s) => s.setActiveConfig);
  const getActiveConfig = useChatbotStore((s) => s.getActiveConfig);
  const addFaq = useChatbotStore((s) => s.addFaq);
  const removeFaq = useChatbotStore((s) => s.removeFaq);
  const addProduct = useChatbotStore((s) => s.addProduct);
  const removeProduct = useChatbotStore((s) => s.removeProduct);

  const createAgent = useAgentStore((s) => s.createAgent);
  const goToAgent = useUiStore((s) => s.goToAgent);

  const config = getActiveConfig();

  // FAQ form state
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');

  // Product form state
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');

  // LLM model list
  const [llmModels, setLlmModels] = useState([]);

  // Export widget state
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState(null);

  // Preview state
  const [previewMessages, setPreviewMessages] = useState([]);
  const [previewInput, setPreviewInput] = useState('');
  const previewEndRef = useRef(null);

  // Scroll preview to bottom on new messages
  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewMessages]);

  // Fetch LLM models when provider changes
  useEffect(() => {
    if (!config) return;
    const provider = config.provider || 'claude';
    window.electronAPI?.fetchModels(provider).then((res) => {
      if (res?.success && res.models?.length > 0) {
        setLlmModels(res.models);
        if (!res.models.includes(config.model)) {
          update('model', res.models[0]);
        }
      } else {
        setLlmModels([]);
      }
    }).catch(() => setLlmModels([]));
  }, [config?.provider, activeConfigId]);

  // Reset preview when config changes
  useEffect(() => {
    if (config) {
      setPreviewMessages([
        { role: 'assistant', text: config.greeting || 'Hi! How can I help you today?' },
      ]);
    }
  }, [activeConfigId]);

  const update = (field, value) => {
    if (config) updateConfig(config.id, { [field]: value });
  };

  const handleAddFaq = () => {
    if (!config || !faqQ.trim() || !faqA.trim()) return;
    addFaq(config.id, faqQ.trim(), faqA.trim());
    setFaqQ('');
    setFaqA('');
  };

  const handleAddProduct = () => {
    if (!config || !prodName.trim()) return;
    addProduct(config.id, prodName.trim(), prodDesc.trim(), prodPrice.trim());
    setProdName('');
    setProdDesc('');
    setProdPrice('');
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages((prev) => [
      ...prev,
      { role: 'user', text: previewInput.trim() },
      { role: 'assistant', text: '(Preview — responses will appear here when connected to an LLM)' },
    ]);
    setPreviewInput('');
  };

  const handleGenerateAgent = () => {
    if (!config) return;
    const { nodes, edges } = configToAgentFlow(config);
    const newAgent = createAgent({
      name: `${config.businessName || 'Chatbot'} Agent`,
      description: `Customer chatbot for ${config.businessName || 'business'}`,
      icon: '💬',
      color: config.widgetColor || '#3B82F6',
      flow: { nodes, edges },
    });
    goToAgent(newAgent.id);
  };

  /* ─── No config selected — show list / create ─── */
  if (!config) {
    return (
      <div className="h-full overflow-y-auto p-6" data-tour="chatbot-builder">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-[var(--hd)]">Chatbot Builder</h1>
            <p className="text-xs text-[var(--dm)] mt-1">
              Create customer-facing AI chatbots for your business
            </p>
          </div>
          <button
            onClick={() => createConfig()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Chatbot
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageCircle size={48} className="text-[var(--dm)] mb-4" />
            <h2 className="text-sm font-semibold text-[var(--hd)] mb-1">No chatbots yet</h2>
            <p className="text-xs text-[var(--dm)] mb-4 max-w-xs">
              Create your first customer-facing chatbot by clicking the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConfig(c.id)}
                className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-4 text-left hover:border-blue-500/30 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{c.avatarEmoji || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--hd)] truncate">
                      {c.businessName || 'Untitled Chatbot'}
                    </h3>
                    <p className="text-xs text-[var(--dm)]">{c.industry || 'No industry set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--dm)]">
                  <span>{c.faqs?.length || 0} FAQs</span>
                  <span>{c.products?.length || 0} Products</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── Config editor ─── */
  return (
    <div className="h-full overflow-hidden flex" data-tour="chatbot-builder">
      {/* Left: config form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveConfig(null)}
              className="text-xs text-[var(--dm)] hover:text-[var(--sb)] transition-colors"
            >
              &larr; All Chatbots
            </button>
            <h1 className="text-lg font-bold text-[var(--hd)]">
              {config.businessName || 'Untitled Chatbot'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const data = generateWidget(config);
                setExportData(data);
                setShowExport(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-xs font-medium transition-colors"
            >
              <Package size={14} />
              Export Widget
            </button>
            <button
              onClick={handleGenerateAgent}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              data-tour="chatbot-generate"
            >
              <Sparkles size={14} />
              Generate Agent
            </button>
            <button
              onClick={() => {
                deleteConfig(config.id);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* ─── Business Profile ─── */}
        <Section icon={Building2} title="Business Profile" tourId="chatbot-profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Business Name"
              value={config.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              placeholder="Acme Corp"
            />
            <Field
              label="Industry"
              value={config.industry}
              onChange={(e) => update('industry', e.target.value)}
              placeholder="E-commerce, SaaS, Healthcare..."
            />
            <Field
              label="Website"
              value={config.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="mt-4">
            <Field
              label="Business Description"
              value={config.businessDescription}
              onChange={(e) => update('businessDescription', e.target.value)}
              placeholder="Describe what your business does..."
              rows={3}
            />
          </div>
        </Section>

        {/* ─── AI Model ─── */}
        <Section icon={Brain} title="AI Model" tourId="chatbot-model">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-1 block">Provider</span>
              <select
                value={config.provider || 'claude'}
                onChange={(e) => update('provider', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-3 py-2 text-sm text-[var(--tx)] focus:outline-none focus:ring-1 focus:ring-blue-500/40 cursor-pointer"
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-1 block">Model</span>
              {llmModels.length > 0 ? (
                <select
                  value={config.model || ''}
                  onChange={(e) => update('model', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-3 py-2 text-sm text-[var(--tx)] focus:outline-none focus:ring-1 focus:ring-blue-500/40 cursor-pointer"
                >
                  {llmModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model || ''}
                  onChange={(e) => update('model', e.target.value)}
                  placeholder="e.g. claude-sonnet-4-6"
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-3 py-2 text-sm text-[var(--tx)] placeholder:text-[var(--dm)] focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
              )}
            </div>
          </div>
          <p className="text-[10px] text-[var(--dm)] mt-2">
            The generated agent will use this AI model for responses.
          </p>
        </Section>

        {/* ─── Knowledge Base ─── */}
        <Section icon={BookOpen} title="Knowledge Base" tourId="chatbot-knowledge">
          {/* FAQs */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-[var(--sb)] mb-2 flex items-center gap-1">
              <HelpCircle size={12} /> Frequently Asked Questions
            </h3>
            {config.faqs?.length > 0 && (
              <div className="space-y-2 mb-3">
                {config.faqs.map((faq) => (
                  <div key={faq.id} className="bg-[var(--bg)] rounded-lg p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--hd)]">Q: {faq.question}</p>
                        <p className="text-[var(--dm)] mt-1">A: {faq.answer}</p>
                      </div>
                      <button
                        onClick={() => removeFaq(config.id, faq.id)}
                        className="text-[var(--dm)] hover:text-red-400 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              <Field label="Question" value={faqQ} onChange={(e) => setFaqQ(e.target.value)} placeholder="What is your return policy?" />
              <Field label="Answer" value={faqA} onChange={(e) => setFaqA(e.target.value)} placeholder="We offer 30-day returns..." rows={2} />
              <button
                onClick={handleAddFaq}
                disabled={!faqQ.trim() || !faqA.trim()}
                className="flex items-center gap-1 self-start px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={13} /> Add FAQ
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-[var(--sb)] mb-2 flex items-center gap-1">
              <Package size={12} /> Products / Services
            </h3>
            {config.products?.length > 0 && (
              <div className="space-y-2 mb-3">
                {config.products.map((p) => (
                  <div key={p.id} className="bg-[var(--bg)] rounded-lg p-3 text-xs flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-[var(--hd)]">{p.name}</span>
                      {p.price && <span className="ml-2 text-green-400">${p.price}</span>}
                      {p.description && <p className="text-[var(--dm)] mt-0.5 truncate">{p.description}</p>}
                    </div>
                    <button
                      onClick={() => removeProduct(config.id, p.id)}
                      className="text-[var(--dm)] hover:text-red-400 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Field label="Name" value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Premium Plan" />
              <Field label="Description" value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="All features included" />
              <Field label="Price" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="49.99" />
            </div>
            <button
              onClick={handleAddProduct}
              disabled={!prodName.trim()}
              className="flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={13} /> Add Product
            </button>
          </div>

          {/* Custom Instructions */}
          <Field
            label="Custom Instructions"
            value={config.customInstructions}
            onChange={(e) => update('customInstructions', e.target.value)}
            placeholder="Any additional rules or instructions for the chatbot..."
            rows={3}
          />
        </Section>

        {/* ─── Behavior ─── */}
        <Section icon={Sliders} title="Behavior" tourId="chatbot-behavior">
          <div className="space-y-4">
            {/* Tone */}
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-2 block">Tone</span>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update('tone', t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      config.tone === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--bg)] text-[var(--sb)] hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Response Length */}
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-2 block">
                Max Response Length: {config.maxResponseLength} words
              </span>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={config.maxResponseLength}
                onChange={(e) => update('maxResponseLength', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Escalation Email */}
            <Field
              label="Escalation Email"
              value={config.escalationEmail}
              onChange={(e) => update('escalationEmail', e.target.value)}
              placeholder="support@example.com"
              type="email"
            />
          </div>
        </Section>

        {/* ─── Appearance ─── */}
        <Section icon={Palette} title="Appearance" tourId="chatbot-appearance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Widget Color */}
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-2 block">Widget Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.widgetColor}
                  onChange={(e) => update('widgetColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                />
                <span className="text-xs text-[var(--dm)] font-mono">{config.widgetColor}</span>
              </div>
            </div>

            {/* Position */}
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-2 block">Widget Position</span>
              <div className="flex gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => update('position', pos.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      config.position === pos.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--bg)] text-[var(--sb)] hover:bg-white/5'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Greeting */}
            <div className="md:col-span-2">
              <Field
                label="Greeting Message"
                value={config.greeting}
                onChange={(e) => update('greeting', e.target.value)}
                placeholder="Hi! How can I help you today?"
              />
            </div>

            {/* Avatar Emoji */}
            <div>
              <span className="text-xs font-medium text-[var(--sb)] mb-2 block">Avatar</span>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => update('avatarEmoji', emoji)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors ${
                      config.avatarEmoji === emoji
                        ? 'bg-blue-600/30 ring-1 ring-blue-500'
                        : 'bg-[var(--bg)] hover:bg-white/5'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Right: live preview */}
      <div className="w-[360px] border-l border-[var(--glassBd)] flex flex-col bg-[var(--sf)]/50" data-tour="chatbot-preview">
        {/* Preview header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glassBd)]">
          <Eye size={14} className="text-[var(--blue)]" />
          <span className="text-xs font-semibold text-[var(--hd)]">Live Preview</span>
        </div>

        {/* Chat widget mockup */}
        <div className="flex-1 flex flex-col p-4">
          {/* Widget frame */}
          <div
            className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-[var(--glassBd)] bg-[var(--bg)]"
            style={{ maxHeight: 520 }}
          >
            {/* Widget header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: config.widgetColor || '#3B82F6' }}
            >
              <span className="text-xl">{config.avatarEmoji || '🤖'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {config.businessName || 'Chatbot'}
                </p>
                <p className="text-[10px] text-white/70">Online</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {previewMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[var(--glass)]'
                    }`}
                  >
                    {msg.role === 'user' ? <User size={12} /> : <span className="text-sm">{config.avatarEmoji || '🤖'}</span>}
                  </div>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-[var(--glass)] text-[var(--tx)] rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={previewEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-[var(--glassBd)] p-2">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-[var(--glass)] rounded-lg px-3 py-2 text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none"
                  placeholder="Type a message..."
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePreviewSend()}
                />
                <button
                  onClick={handlePreviewSend}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white transition-colors"
                  style={{ background: config.widgetColor || '#3B82F6' }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System prompt preview */}
        <div className="border-t border-[var(--glassBd)] p-3">
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--dm)] hover:text-[var(--sb)] transition-colors flex items-center gap-1">
              <ChevronDown size={12} /> Generated System Prompt
            </summary>
            <pre className="mt-2 p-2 bg-[var(--bg)] rounded-lg text-[10px] text-[var(--dm)] whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
              {generateSystemPrompt(config)}
            </pre>
          </details>
        </div>
      </div>

      {/* Export Widget Modal */}
      {showExport && exportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--sf)] border border-[var(--glassBd)] rounded-xl shadow-2xl w-[540px] max-h-[80vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--hd)]">Export Chat Widget</h3>
              <button
                onClick={() => setShowExport(false)}
                className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[var(--dm)]">
              Your chat widget is ready. Download the HTML file or copy the embed code to add it to your website.
            </p>

            {/* Embed Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[var(--sb)] uppercase tracking-wider">Embed Code</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportData.embedSnippet);
                    toast.success('Embed code copied to clipboard');
                  }}
                  className="text-[10px] text-blue-400 hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="p-3 bg-[var(--bg)] rounded-lg text-[10px] text-[var(--dm)] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {exportData.embedSnippet}
              </pre>
            </div>

            {/* Setup Instructions */}
            <div>
              <span className="text-[11px] font-medium text-[var(--sb)] uppercase tracking-wider block mb-1.5">Setup Instructions</span>
              <div className="text-xs text-[var(--dm)] space-y-1.5 bg-[var(--bg)] rounded-lg p-3">
                <p><strong className="text-[var(--tx)]">1.</strong> Download the HTML file using the button below.</p>
                <p><strong className="text-[var(--tx)]">2.</strong> Host it on your web server or static hosting (Netlify, Vercel, etc.).</p>
                <p><strong className="text-[var(--tx)]">3.</strong> Update <code className="text-blue-400">YOUR_HOSTED_WIDGET_URL</code> in the embed code with the hosted URL.</p>
                <p><strong className="text-[var(--tx)]">4.</strong> Paste the embed code into your website's HTML before <code className="text-blue-400">&lt;/body&gt;</code>.</p>
                <p><strong className="text-[var(--tx)]">5.</strong> <em>Optional:</em> Set the <code className="text-blue-400">API_ENDPOINT</code> variable in the HTML for live LLM responses.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExport(false)}
                className="px-3 py-1.5 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-xs rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const name = `${(config.businessName || 'chatbot').toLowerCase().replace(/\s+/g, '-')}-widget.html`;
                  const result = await window.electronAPI?.saveWidget({
                    htmlContent: exportData.htmlContent,
                    suggestedName: name,
                  });
                  if (result?.success) {
                    toast.success('Widget saved successfully');
                    setShowExport(false);
                  } else if (!result?.canceled) {
                    toast.error(result?.error || 'Failed to save widget');
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Save size={13} />
                Download Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
