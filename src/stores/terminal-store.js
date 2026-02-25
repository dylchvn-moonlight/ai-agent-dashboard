import { create } from 'zustand';

let nextId = 1;

const useTerminalStore = create((set, get) => ({
  /** @type {{ id: string, label: string, shell: string|null, alive: boolean }[]} */
  sessions: [],
  activeSessionId: null,

  createSession: (label) => {
    const id = `term-${nextId++}`;
    const session = {
      id,
      label: label || `Terminal ${get().sessions.length + 1}`,
      shell: null,
      alive: true,
    };
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: id,
    }));
    return id;
  },

  removeSession: (id) => {
    set((s) => {
      const remaining = s.sessions.filter((t) => t.id !== id);
      let nextActive = s.activeSessionId;
      if (nextActive === id) {
        nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return { sessions: remaining, activeSessionId: nextActive };
    });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  markDead: (id) => {
    set((s) => ({
      sessions: s.sessions.map((t) =>
        t.id === id ? { ...t, alive: false } : t
      ),
    }));
  },
}));

export default useTerminalStore;
