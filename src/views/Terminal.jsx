import React, { useEffect } from 'react';
import { Plus, X, TerminalSquare, RotateCcw } from 'lucide-react';
import useTerminalStore from '@/stores/terminal-store';
import TerminalInstance from '@/components/TerminalInstance';

export default function Terminal() {
  const sessions = useTerminalStore((s) => s.sessions);
  const activeSessionId = useTerminalStore((s) => s.activeSessionId);
  const createSession = useTerminalStore((s) => s.createSession);
  const removeSession = useTerminalStore((s) => s.removeSession);
  const setActiveSession = useTerminalStore((s) => s.setActiveSession);

  // Auto-create first session on mount if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, []);

  const handleNewTab = () => {
    createSession();
  };

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    window.electronAPI?.terminalKill({ id });
    removeSession(id);
  };

  const handleRestart = (id) => {
    // Remove old session and create a fresh one
    window.electronAPI?.terminalKill({ id });
    removeSession(id);
    createSession();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-[var(--glassBd)] bg-[var(--sf)]/60 backdrop-blur-sm min-h-[40px] px-1">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`
                group relative flex items-center gap-2 px-3 py-2 text-xs font-medium
                transition-all duration-150 border-r border-[var(--glassBd)]
                ${isActive
                  ? 'bg-[var(--bg)] text-blue-400'
                  : 'text-[var(--sb)] hover:text-[var(--tx)] hover:bg-white/[0.03]'
                }
              `}
            >
              {/* Active tab indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-t" />
              )}

              <TerminalSquare size={13} className={isActive ? 'text-blue-400' : 'text-[var(--dm)]'} />
              <span className="max-w-[100px] truncate">{session.label}</span>

              {!session.alive && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Process exited" />
              )}

              {/* Close button */}
              {sessions.length > 1 && (
                <span
                  onClick={(e) => handleCloseTab(e, session.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity cursor-pointer"
                >
                  <X size={12} />
                </span>
              )}
            </button>
          );
        })}

        {/* New tab button */}
        <button
          onClick={handleNewTab}
          className="flex items-center justify-center w-8 h-8 ml-1 rounded text-[var(--dm)] hover:text-[var(--tx)] hover:bg-white/[0.05] transition-colors"
          title="New terminal tab"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Terminal content area */}
      <div className="flex-1 relative overflow-hidden">
        {sessions.map((session) => (
          <div key={session.id} className="absolute inset-0">
            <TerminalInstance
              sessionId={session.id}
              visible={session.id === activeSessionId}
            />

            {/* Dead session overlay */}
            {!session.alive && session.id === activeSessionId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm z-10">
                <p className="text-[var(--sb)] text-sm mb-3">Process exited</p>
                <button
                  onClick={() => handleRestart(session.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
                >
                  <RotateCcw size={14} />
                  Restart
                </button>
              </div>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--dm)]">
            <TerminalSquare size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No terminal sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
