import React from 'react';
import { Play, DollarSign, Clock } from 'lucide-react';
import useUiStore from '@/stores/ui-store';
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
  const status = STATUS_STYLES[agent.status] || STATUS_STYLES.draft;

  const executions = agent.metrics?.totalRuns ?? agent.metrics?.totalExecutions ?? 0;
  const cost = agent.metrics?.totalCost ?? 0;
  const latency = agent.metrics?.avgLatency ?? 0;

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
