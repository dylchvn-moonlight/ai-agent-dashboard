import { create } from 'zustand';
import { uid } from '@/lib/utils';

const useExecutionStore = create((set, get) => ({
  executions: [],
  activeExecutionId: null,
  isRunning: false,

  startExecution: (agentId) => {
    const execution = {
      id: uid(),
      agentId,
      status: 'running',
      startedAt: Date.now(),
      completedAt: null,
      steps: [],
      result: null,
      error: null,
    };

    set((state) => ({
      executions: [execution, ...state.executions],
      activeExecutionId: execution.id,
      isRunning: true,
    }));

    return execution;
  },

  addStep: (executionId, step) => {
    const entry = {
      id: uid(),
      nodeId: step.nodeId || null,
      label: step.label || '',
      status: step.status || 'running',
      input: step.input || null,
      output: step.output || null,
      startedAt: Date.now(),
      completedAt: step.status === 'completed' ? Date.now() : null,
      duration: null,
      tokens: step.tokens || 0,
    };

    set((state) => ({
      executions: state.executions.map((ex) =>
        ex.id === executionId
          ? { ...ex, steps: [...ex.steps, entry] }
          : ex
      ),
    }));

    return entry;
  },

  completeExecution: (executionId, result) => {
    set((state) => ({
      executions: state.executions.map((ex) =>
        ex.id === executionId
          ? {
              ...ex,
              status: 'completed',
              completedAt: Date.now(),
              result: result || null,
            }
          : ex
      ),
      // Always clear isRunning — only one execution is active at a time
      isRunning: false,
    }));
  },

  failExecution: (executionId, error) => {
    set((state) => ({
      executions: state.executions.map((ex) =>
        ex.id === executionId
          ? {
              ...ex,
              status: 'failed',
              completedAt: Date.now(),
              error: typeof error === 'string' ? error : error?.message || 'Unknown error',
            }
          : ex
      ),
      // Always clear isRunning — only one execution is active at a time
      isRunning: false,
    }));
  },

  setActiveExecution: (id) => {
    set({ activeExecutionId: id });
  },

  clearExecutions: () => {
    set({
      executions: [],
      activeExecutionId: null,
      isRunning: false,
    });
  },
}));

export default useExecutionStore;
