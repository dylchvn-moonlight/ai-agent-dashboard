import { create } from 'zustand';
import { uid } from '@/lib/utils';

const DEFAULT_CONFIG = {
  // Business Profile
  businessName: '',
  businessDescription: '',
  industry: '',
  website: '',

  // AI Model
  provider: 'claude',
  model: 'claude-sonnet-4-6',

  // Knowledge Base
  faqs: [],           // [{ question, answer }]
  products: [],       // [{ name, description, price }]
  customInstructions: '',

  // Behavior
  tone: 'professional',
  maxResponseLength: 150,
  escalationEmail: '',

  // Appearance
  widgetColor: '#3B82F6',
  greeting: 'Hi! How can I help you today?',
  avatarEmoji: '🤖',
  position: 'bottom-right',
};

const useChatbotStore = create((set, get) => ({
  configs: [],
  activeConfigId: null,

  createConfig: (overrides = {}) => {
    const config = {
      id: uid(),
      ...DEFAULT_CONFIG,
      ...overrides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => ({
      configs: [...s.configs, config],
      activeConfigId: config.id,
    }));
    return config;
  },

  updateConfig: (id, updates) => {
    set((s) => ({
      configs: s.configs.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    }));
  },

  deleteConfig: (id) => {
    set((s) => ({
      configs: s.configs.filter((c) => c.id !== id),
      activeConfigId: s.activeConfigId === id ? null : s.activeConfigId,
    }));
  },

  setActiveConfig: (id) => set({ activeConfigId: id }),

  getActiveConfig: () => {
    const s = get();
    return s.configs.find((c) => c.id === s.activeConfigId) || null;
  },

  // FAQ helpers
  addFaq: (configId, question, answer) => {
    set((s) => ({
      configs: s.configs.map((c) =>
        c.id === configId
          ? { ...c, faqs: [...c.faqs, { id: uid(), question, answer }], updatedAt: Date.now() }
          : c
      ),
    }));
  },

  removeFaq: (configId, faqId) => {
    set((s) => ({
      configs: s.configs.map((c) =>
        c.id === configId
          ? { ...c, faqs: c.faqs.filter((f) => f.id !== faqId), updatedAt: Date.now() }
          : c
      ),
    }));
  },

  // Product helpers
  addProduct: (configId, name, description, price) => {
    set((s) => ({
      configs: s.configs.map((c) =>
        c.id === configId
          ? { ...c, products: [...c.products, { id: uid(), name, description, price }], updatedAt: Date.now() }
          : c
      ),
    }));
  },

  removeProduct: (configId, productId) => {
    set((s) => ({
      configs: s.configs.map((c) =>
        c.id === configId
          ? { ...c, products: c.products.filter((p) => p.id !== productId), updatedAt: Date.now() }
          : c
      ),
    }));
  },
}));

export default useChatbotStore;
