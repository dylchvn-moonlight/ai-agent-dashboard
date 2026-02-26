import React, { useEffect, useState } from 'react';
import { Plus, X, TerminalSquare, RotateCcw, Workflow, ChevronDown } from 'lucide-react';
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

  const [showN8nBar, setShowN8nBar] = useState(false);

  const handleRestart = (id) => {
    // Remove old session and create a fresh one
    window.electronAPI?.terminalKill({ id });
    removeSession(id);
    createSession();
  };

  const sendToTerminal = (cmd) => {
    if (activeSessionId) {
      window.electronAPI?.terminalWrite({ id: activeSessionId, data: cmd + '\n' });
    }
  };

  const N8N_COMMANDS = [
    { label: 'List Workflows', cmd: 'curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows" | jq .data[].name' },
    { label: 'List Credentials', cmd: 'curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/credentials" | jq .data[].name' },
    { label: 'List Executions', cmd: 'curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/executions?limit=10" | jq .data[]' },
    { label: 'Health Check', cmd: 'curl -s "$N8N_URL/healthz" && echo " ✓ n8n is running"' },
    { label: 'Start n8n (Docker)', cmd: 'docker start n8n 2>/dev/null || echo "n8n container not found"' },
    { label: 'n8n Logs', cmd: 'docker logs --tail 50 n8n 2>/dev/null || echo "n8n container not found"' },
  ];

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

      {/* n8n Quick Actions Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[var(--glassBd)] bg-[var(--sf)]/40">
        <button
          onClick={() => setShowN8nBar(!showN8nBar)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
            showN8nBar
              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
              : 'text-[var(--dm)] hover:text-[var(--sb)] hover:bg-white/5 border border-transparent'
          }`}
        >
          <Workflow size={11} />
          n8n
          <ChevronDown size={10} className={`transition-transform ${showN8nBar ? 'rotate-180' : ''}`} />
        </button>
        {showN8nBar && N8N_COMMANDS.map((item) => (
          <button
            key={item.label}
            onClick={() => sendToTerminal(item.cmd)}
            className="px-2 py-1 text-[10px] font-medium text-[var(--dm)] hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-colors whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
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
