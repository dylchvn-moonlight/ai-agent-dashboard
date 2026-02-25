import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Send,
  Trash2,
  Briefcase,
  MessageSquare,
  Loader2,
  BookOpen,
  Brain,
} from 'lucide-react';
import useAssistantStore from '@/stores/assistant-store';
import ChatMessage from '@/components/ChatMessage';
import KnowledgeBasePanel from '@/components/KnowledgeBasePanel';

const PROVIDERS = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'local', label: 'Local' },
];

export default function BusinessAssistant() {
  const conversations = useAssistantStore((s) => s.conversations);
  const activeConversationId = useAssistantStore((s) => s.activeConversationId);
  const createConversation = useAssistantStore((s) => s.createConversation);
  const deleteConversation = useAssistantStore((s) => s.deleteConversation);
  const setActiveConversation = useAssistantStore((s) => s.setActiveConversation);
  const getActiveConversation = useAssistantStore((s) => s.getActiveConversation);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const getKnowledgeContext = useAssistantStore((s) => s.getKnowledgeContext);
  const selectedProvider = useAssistantStore((s) => s.selectedProvider);
  const selectedModel = useAssistantStore((s) => s.selectedModel);
  const setProvider = useAssistantStore((s) => s.setProvider);
  const setModel = useAssistantStore((s) => s.setModel);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbCollapsed, setKbCollapsed] = useState(false);
  const [models, setModels] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch models when provider changes
  useEffect(() => {
    window.electronAPI?.fetchModels(selectedProvider).then((res) => {
      if (res?.success && res.models?.length > 0) {
        setModels(res.models);
        if (!res.models.includes(selectedModel)) {
          setModel(res.models[0]);
        }
      } else {
        setModels([]);
      }
    }).catch(() => setModels([]));
  }, [selectedProvider]);

  const activeConvo = getActiveConversation();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvo?.messages?.length]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let convoId = activeConversationId;

    // Auto-create conversation if none active
    if (!convoId) {
      const convo = createConversation();
      convoId = convo.id;
    }

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage(convoId, 'user', userMessage);
    setLoading(true);

    try {
      // Build conversation history for context
      const currentConvo = useAssistantStore.getState().conversations.find((c) => c.id === convoId);
      const history = (currentConvo?.messages || []).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Get knowledge base context
      const knowledgeContext = getKnowledgeContext();

      // Call LLM via IPC with selected provider/model
      const result = await window.electronAPI?.assistantChat({
        message: userMessage,
        history,
        knowledgeContext,
        provider: selectedProvider,
        model: selectedModel,
      });

      if (result?.text) {
        addMessage(convoId, 'assistant', result.text);
      } else {
        addMessage(convoId, 'assistant', result?.error || 'Failed to get a response. Check your API keys in Settings.');
      }
    } catch (err) {
      addMessage(convoId, 'assistant', `Error: ${err.message || 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden" data-tour="assistant-view">
      {/* Left sidebar: conversation list */}
      <div className="w-56 border-r border-[var(--glassBd)] bg-[var(--sf)]/50 flex flex-col" data-tour="assistant-threads">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--glassBd)]">
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-[var(--blue)]" />
            <span className="text-xs font-semibold text-[var(--hd)]">Assistant</span>
          </div>
          <button
            onClick={() => createConversation()}
            className="text-[var(--dm)] hover:text-blue-400 transition-colors"
            title="New conversation"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-3">
              <MessageSquare size={24} className="mx-auto text-[var(--dm)] mb-2" />
              <p className="text-xs text-[var(--dm)]">No conversations yet</p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setActiveConversation(convo.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors group flex items-start justify-between gap-1 ${
                  activeConversationId === convo.id
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-[var(--sb)] hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate flex-1">{convo.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(convo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--dm)] hover:text-red-400 shrink-0 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center: chat area */}
      <div className="flex-1 flex flex-col" data-tour="assistant-chat">
        {activeConvo ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glassBd)]">
              <MessageSquare size={14} className="text-[var(--blue)]" />
              <span className="text-xs font-semibold text-[var(--hd)] truncate">
                {activeConvo.title}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Brain size={12} className="text-[var(--dm)]" />
                <select
                  value={selectedProvider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="bg-[var(--bg)] border border-[var(--glassBd)] rounded-md px-2 py-1 text-[10px] text-[var(--tx)] outline-none cursor-pointer"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {models.length > 0 ? (
                  <select
                    value={selectedModel}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-[var(--bg)] border border-[var(--glassBd)] rounded-md px-2 py-1 text-[10px] text-[var(--tx)] outline-none cursor-pointer max-w-[180px]"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Model name"
                    className="bg-[var(--bg)] border border-[var(--glassBd)] rounded-md px-2 py-1 text-[10px] text-[var(--tx)] outline-none w-36"
                  />
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConvo.messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} text={msg.text} createdAt={msg.createdAt} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-[var(--dm)]">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-[var(--glassBd)] p-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-[var(--glass)] border border-[var(--glassBd)] rounded-xl px-4 py-2.5 text-sm text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:ring-1 focus:ring-blue-500/40"
                  placeholder="Ask your AI assistant..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Briefcase size={48} className="text-[var(--dm)] mb-4" />
            <h2 className="text-sm font-semibold text-[var(--hd)] mb-1">Business AI Assistant</h2>
            <p className="text-xs text-[var(--dm)] max-w-sm mb-4">
              Your internal AI helper. Ask questions, get analysis, draft documents, or explore
              ideas. Add knowledge in the panel to the right for more relevant responses.
            </p>
            <button
              onClick={() => createConversation()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Conversation
            </button>
          </div>
        )}
      </div>

      {/* Right: knowledge base panel */}
      <KnowledgeBasePanel collapsed={kbCollapsed} onToggle={() => setKbCollapsed(!kbCollapsed)} />
    </div>
  );
}
