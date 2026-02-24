import { create } from 'zustand';

const useUiStore = create((set) => ({
  view: 'dashboard',
  theme: 'dark',
  sidebarCollapsed: false,
  modal: null,
  cmdOpen: false,
  activeAgentId: null,

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
}));

export default useUiStore;
