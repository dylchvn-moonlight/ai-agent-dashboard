import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  view: 'dashboard',
  theme: 'dark',
  sidebarCollapsed: false,
  modal: null,
  cmdOpen: false,
  activeAgentId: null,

  // Tour state
  tourActiveView: null,        // which view's tour is currently running
  completedTours: {},          // { [viewId]: true } — persisted via settings

  setView: (view) => set({ view }),

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      document.body.classList.toggle('light', next === 'light');
      return { theme: next };
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setModal: (modal) => set({ modal }),

  setCmdOpen: (open) => set({ cmdOpen: open }),

  setActiveAgentId: (id) => set({ activeAgentId: id }),

  goToAgent: (id) => {
    set({
      activeAgentId: id,
      view: 'builder',
    });
  },

  // Tour actions
  startTour: (viewId) => {
    set({ tourActiveView: viewId });
  },

  finishTour: async (viewId) => {
    const state = get();
    const updated = { ...state.completedTours, [viewId]: true };
    set({ tourActiveView: null, completedTours: updated });

    // Persist to settings
    try {
      const settings = await window.electronAPI?.loadSettings() || {};
      await window.electronAPI?.saveSettings({
        ...settings,
        completedTours: updated,
      });
    } catch {
      localStorage.setItem('completedTours', JSON.stringify(updated));
    }
  },

  loadCompletedTours: async () => {
    try {
      const settings = await window.electronAPI?.loadSettings();
      if (settings?.completedTours) {
        set({ completedTours: settings.completedTours });
      }
    } catch {
      try {
        const stored = localStorage.getItem('completedTours');
        if (stored) set({ completedTours: JSON.parse(stored) });
      } catch { /* ignore */ }
    }
  },
}));

export default useUiStore;
