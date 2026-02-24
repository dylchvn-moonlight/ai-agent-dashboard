import { create } from 'zustand';
import { uid } from '@/lib/utils';

const AGENT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function randomColor() {
  return AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
}

function createDefaultAgent(overrides = {}) {
  return {
    id: uid(),
    name: 'Untitled Agent',
    description: '',
    icon: 'bot',
    color: randomColor(),
    status: 'draft',
    version: '0.1.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    flow: { nodes: [], edges: [] },
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      maxTokens: 4096,
      streaming: true,
    },
    training: {
      sessions: [],
      lastTrained: null,
      rating: null,
    },
    deployment: {
      endpoint: null,
      apiKey: null,
      isDeployed: false,
      lastDeployed: null,
      environment: 'development',
    },
    metrics: {
      totalRuns: 0,
      successRate: 0,
      avgLatency: 0,
      avgTokens: 0,
      lastRun: null,
    },
    ...overrides,
  };
}

let saveTimeout = null;

function debouncedSave(agents) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (window.electronAPI?.saveData) {
      window.electronAPI.saveData({ agents });
    }
  }, 500);
}

const useAgentStore = create((set, get) => ({
  agents: [],
  activeAgentId: null,

  createAgent: (overrides = {}) => {
    const agent = createDefaultAgent(overrides);
    set((state) => {
      const agents = [...state.agents, agent];
      debouncedSave(agents);
      return { agents, activeAgentId: agent.id };
    });
    return agent;
  },

  updateAgent: (id, updates) => {
    set((state) => {
      const agents = state.agents.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      );
      debouncedSave(agents);
      return { agents };
    });
  },

  deleteAgent: (id) => {
    set((state) => {
      const agents = state.agents.filter((a) => a.id !== id);
      const activeAgentId =
        state.activeAgentId === id ? null : state.activeAgentId;
      debouncedSave(agents);
      return { agents, activeAgentId };
    });
  },

  setActiveAgent: (id) => {
    set({ activeAgentId: id });
  },

  duplicateAgent: (id) => {
    const { agents } = get();
    const source = agents.find((a) => a.id === id);
    if (!source) return null;

    const clone = createDefaultAgent({
      ...source,
      id: uid(),
      name: `${source.name} (Copy)`,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deployment: {
        ...source.deployment,
        isDeployed: false,
        lastDeployed: null,
        endpoint: null,
        apiKey: null,
      },
      metrics: {
        totalRuns: 0,
        successRate: 0,
        avgLatency: 0,
        avgTokens: 0,
        lastRun: null,
      },
    });

    set((state) => {
      const agents = [...state.agents, clone];
      debouncedSave(agents);
      return { agents };
    });

    return clone;
  },

  _loadAgents: async () => {
    if (window.electronAPI?.loadData) {
      try {
        const data = await window.electronAPI.loadData();
        if (data?.agents && Array.isArray(data.agents) && data.agents.length > 0) {
          set({ agents: data.agents });
        }
      } catch (err) {
        console.error('Failed to load agents:', err);
      }
    }
  },
}));

// Auto-load on init
useAgentStore.getState()._loadAgents();

export default useAgentStore;
