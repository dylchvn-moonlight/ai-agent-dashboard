// n8n-store.js — Zustand store for n8n integration state
import { create } from 'zustand';
import n8nService from '@/services/n8n-service';

const useN8nStore = create((set, get) => ({
  // Connection state
  connected: false,
  connectionError: null,
  testing: false,

  // Data
  workflows: [],
  credentials: [],
  executions: [],
  loading: false,

  /**
   * Test connection to n8n instance.
   */
  testConnection: async () => {
    set({ testing: true, connectionError: null });
    try {
      const result = await n8nService.testConnection();
      if (result?.success) {
        set({ connected: true, testing: false, connectionError: null });
        // Auto-fetch workflows on successful connection
        get().fetchWorkflows();
        return true;
      } else {
        set({ connected: false, testing: false, connectionError: result?.error || 'Connection failed' });
        return false;
      }
    } catch (e) {
      set({ connected: false, testing: false, connectionError: e.message });
      return false;
    }
  },

  /**
   * Fetch all workflows from n8n.
   */
  fetchWorkflows: async () => {
    set({ loading: true });
    try {
      const result = await n8nService.listWorkflows();
      if (result?.success) {
        set({ workflows: result.data || [], loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  /**
   * Fetch all credentials from n8n.
   */
  fetchCredentials: async () => {
    try {
      const result = await n8nService.listCredentials();
      if (result?.success) {
        set({ credentials: result.data || [] });
      }
    } catch { /* ignore */ }
  },

  /**
   * Deploy a workflow JSON to n8n.
   */
  deployWorkflow: async (workflowJson, activate = false) => {
    try {
      const result = await n8nService.createWorkflow(workflowJson);
      if (result?.success && result.data?.id) {
        if (activate) {
          await n8nService.activateWorkflow(result.data.id);
        }
        get().fetchWorkflows();
        return { success: true, workflowId: result.data.id };
      }
      return { success: false, error: result?.error || 'Deploy failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Activate a workflow by ID.
   */
  activateWorkflow: async (id) => {
    const result = await n8nService.activateWorkflow(id);
    if (result?.success) get().fetchWorkflows();
    return result;
  },

  /**
   * Deactivate a workflow by ID.
   */
  deactivateWorkflow: async (id) => {
    const result = await n8nService.deactivateWorkflow(id);
    if (result?.success) get().fetchWorkflows();
    return result;
  },

  /**
   * Delete a workflow by ID.
   */
  deleteWorkflow: async (id) => {
    const result = await n8nService.deleteWorkflow(id);
    if (result?.success) get().fetchWorkflows();
    return result;
  },

  /**
   * Reset connection state.
   */
  disconnect: () => {
    set({ connected: false, workflows: [], credentials: [], connectionError: null });
  },
}));

export default useN8nStore;
