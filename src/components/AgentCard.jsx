import React, { useState, useRef, useEffect } from 'react';
import { Play, DollarSign, Clock, MoreVertical, ExternalLink, Trash2 } from 'lucide-react';
import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';
import { truncate } from '@/lib/utils';

const STATUS_STYLES = {
  draft: { label: 'Draft', bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  active: { label: 'Active', bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400' },
  training: { label: 'Training', bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  deployed: { label: 'Deployed', bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  archived: { label: 'Archived', bg: 'bg-gray-500/15', text: 'text-gray-500', dot: 'bg-gray-500' },
};

export default function AgentCard({ agent }) {
  const goToAgent = useUiStore((s) => s.goToAgent);
  const deleteAgent = useAgentStore((s) => s.deleteAgent);
  const status = STATUS_STYLES[agent.status] || STATUS_STYLES.draft;

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  const executions = agent.metrics?.totalRuns ?? agent.metrics?.totalExecutions ?? 0;
  const cost = agent.metrics?.totalCost ?? 0;
  const latency = agent.metrics?.avgLatency ?? 0;

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <button
      onClick={() => goToAgent(agent.id)}
      className="group relative flex flex-col bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl overflow-hidden text-left transition-all duration-200 hover:border-[rgba(255,255,255,0.1)] hover:shadow-lg hover:shadow-black/20"
    >
      {/* Color stripe on the left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: agent.color || '#3B82F6' }}
      />

      {/* Three-dot menu */}
      <div className="absolute top-2 right-2 z-10" ref={menuRef}>
        <div
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            setConfirmDelete(false);
          }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[var(--dm)] hover:text-[var(--tx)] transition-all cursor-pointer"
        >
          <MoreVertical size={14} />
        </div>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-36 bg-[var(--sf)] border border-[var(--glassBd)] rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="button"
              onClick={() => {
                setMenuOpen(false);
                goToAgent(agent.id);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--tx)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ExternalLink size={12} /> Open
            </div>
            {confirmDelete ? (
              <div
                role="button"
                onClick={() => {
                  deleteAgent(agent.id);
                  setMenuOpen(false);
                  setConfirmDelete(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Confirm Delete
              </div>
            ) : (
              <div
                role="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="flex flex-col gap-3 p-4 pl-5">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--hd)] group-hover:text-blue-400 transition-colors truncate">
            {agent.name}
          </h3>
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${status.bg} ${status.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--dm)] leading-relaxed min-h-[2rem]">
          {truncate(agent.description, 80) || 'No description'}
        </p>

        {/* Divider */}
        <div className="border-t border-[var(--glassBd)]" />

        {/* Metrics row */}
        <div className="flex items-center gap-4 text-[11px] text-[var(--dm)]">
          <div className="flex items-center gap-1.5" title="Executions">
            <Play size={12} className="text-[var(--dm)]" />
            <span>{executions.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Total Cost">
            <DollarSign size={12} className="text-[var(--dm)]" />
            <span>{cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Avg Latency">
            <Clock size={12} className="text-[var(--dm)]" />
            <span>{latency > 0 ? `${(latency / 1000).toFixed(1)}s` : '--'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
