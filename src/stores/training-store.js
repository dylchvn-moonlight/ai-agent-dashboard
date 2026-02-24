import { create } from 'zustand';
import { uid } from '@/lib/utils';

const useTrainingStore = create((set, get) => ({
  trainingSessions: [],
  activeSessionId: null,

  createSession: (agentId, config = {}) => {
    const session = {
      id: uid(),
      agentId,
      status: 'active',
      createdAt: Date.now(),
      runs: [],
      config: {
        examples: config.examples || [],
        systemPrompt: config.systemPrompt || '',
        evaluationCriteria: config.evaluationCriteria || [],
        ...config,
      },
    };

    set((state) => ({
      trainingSessions: [session, ...state.trainingSessions],
      activeSessionId: session.id,
    }));

    return session;
  },

  addRun: (sessionId, run) => {
    const entry = {
      id: uid(),
      input: run.input || '',
      output: run.output || '',
      expected: run.expected || null,
      rating: null,
      feedback: '',
      tokens: run.tokens || 0,
      latency: run.latency || 0,
      createdAt: Date.now(),
    };

    set((state) => ({
      trainingSessions: state.trainingSessions.map((s) =>
        s.id === sessionId
          ? { ...s, runs: [...s.runs, entry] }
          : s
      ),
    }));

    return entry;
  },

  rateRun: (sessionId, runId, rating, feedback = '') => {
    set((state) => ({
      trainingSessions: state.trainingSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              runs: s.runs.map((r) =>
                r.id === runId
                  ? { ...r, rating, feedback }
                  : r
              ),
            }
          : s
      ),
    }));
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },
}));

export default useTrainingStore;
