import { create } from 'zustand';
import { uid } from '@/lib/utils';

const useAssistantStore = create((set, get) => ({
  // Conversations
  conversations: [],
  activeConversationId: null,

  // LLM selection
  selectedProvider: 'claude',
  selectedModel: 'claude-sonnet-4-6',

  setProvider: (provider) => set({ selectedProvider: provider }),
  setModel: (model) => set({ selectedModel: model }),

  // Knowledge base
  knowledgeBase: [], // [{ id, title, content, category, createdAt }]

  // ─── Conversation CRUD ───

  createConversation: (title = '') => {
    const convo = {
      id: uid(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => ({
      conversations: [convo, ...s.conversations],
      activeConversationId: convo.id,
    }));
    return convo;
  },

  deleteConversation: (id) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  getActiveConversation: () => {
    const s = get();
    return s.conversations.find((c) => c.id === s.activeConversationId) || null;
  },

  // ─── Messages ───

  addMessage: (conversationId, role, text) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, { id: uid(), role, text, createdAt: Date.now() }],
              updatedAt: Date.now(),
              // Auto-title from first user message
              title:
                c.messages.length === 0 && role === 'user'
                  ? text.slice(0, 50) + (text.length > 50 ? '...' : '')
                  : c.title,
            }
          : c
      ),
    }));
  },

  // ─── Knowledge Base ───

  addKnowledge: (title, content, category = 'General') => {
    const item = {
      id: uid(),
      title,
      content,
      category,
      createdAt: Date.now(),
    };
    set((s) => ({ knowledgeBase: [...s.knowledgeBase, item] }));
    return item;
  },

  removeKnowledge: (id) => {
    set((s) => ({ knowledgeBase: s.knowledgeBase.filter((k) => k.id !== id) }));
  },

  updateKnowledge: (id, updates) => {
    set((s) => ({
      knowledgeBase: s.knowledgeBase.map((k) =>
        k.id === id ? { ...k, ...updates } : k
      ),
    }));
  },

  // Build a context string from knowledge base for the system prompt
  getKnowledgeContext: () => {
    const kb = get().knowledgeBase;
    if (kb.length === 0) return '';
    const parts = ['Internal Knowledge Base:'];
    kb.forEach((item) => {
      parts.push(`\n[${item.category}] ${item.title}:\n${item.content}`);
    });
    return parts.join('\n');
  },
}));

export default useAssistantStore;
