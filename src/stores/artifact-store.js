import { create } from 'zustand';

const useArtifactStore = create((set, get) => ({
  artifacts: [],
  loading: false,
  filters: { agentId: null, type: null },

  loadArtifacts: async (filters = {}) => {
    set({ loading: true });
    try {
      const artifacts = await window.electronAPI?.listArtifacts(filters);
      set({ artifacts: artifacts || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addArtifact: (artifact) => {
    set((state) => ({
      artifacts: [artifact, ...state.artifacts],
    }));
  },

  deleteArtifact: async (artifactId) => {
    const result = await window.electronAPI?.deleteArtifact(artifactId);
    if (result?.success) {
      set((state) => ({
        artifacts: state.artifacts.filter((a) => a.id !== artifactId),
      }));
    }
    return result;
  },

  openArtifact: async (artifactId) => {
    return await window.electronAPI?.openArtifact(artifactId);
  },

  getAgentArtifacts: (agentId) => {
    return get().artifacts.filter((a) => a.agentId === agentId);
  },

  getTotalStorageUsed: () => {
    return get().artifacts.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  },

  setFilters: (filters) => {
    set({ filters });
    get().loadArtifacts(filters);
  },
}));

export default useArtifactStore;
