import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity, Square, ChevronDown, ChevronRight, Clock,
  Zap, CheckCircle2, XCircle, AlertTriangle, Hash,
  Timer, Cpu, BarChart3, History, Loader2, CircleDot,
  SkipForward, Eye, Trash2,
} from 'lucide-react';
import { NODE_DEFINITIONS } from '@/lib/node-types';
import useExecutionStore from '@/stores/execution-store';
import useAgentStore from '@/stores/agent-store';
import { cn, formatNumber, formatDate, formatTime, timeAgo } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDuration(ms) {
  if (ms == null) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function fmtTokens(n) {
  if (!n) return '0';
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}

function getNodeDef(nodeType) {
  return NODE_DEFINITIONS[nodeType] || {
    label: nodeType || 'Unknown',
    icon: CircleDot,
    color: 'var(--dm)',
  };
}

const STATUS_CONFIG = {
  running: {
    label: 'Running',
    color: 'text-[var(--amber)]',
    bg: 'bg-[var(--amber)]/15',
    border: 'border-[var(--amber)]/30',
    icon: Loader2,
    iconClass: 'animate-spin',
  },
  completed: {
    label: 'Completed',
    color: 'text-[var(--green)]',
    bg: 'bg-[var(--green)]/15',
    border: 'border-[var(--green)]/30',
    icon: CheckCircle2,
    iconClass: '',
  },
  failed: {
    label: 'Failed',
    color: 'text-[var(--red)]',
    bg: 'bg-[var(--red)]/15',
    border: 'border-[var(--red)]/30',
    icon: XCircle,
    iconClass: '',
  },
  skipped: {
    label: 'Skipped',
    color: 'text-[var(--dm)]',
    bg: 'bg-[var(--dm)]/10',
    border: 'border-[var(--dm)]/20',
    icon: SkipForward,
    iconClass: '',
  },
};

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.running;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        cfg.color, cfg.bg, cfg.border,
      )}
    >
      <Icon size={10} className={cfg.iconClass} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  TraceCard  — one node in the execution trace                       */
/* ------------------------------------------------------------------ */

function TraceCard({ step, isExpanded, onToggle }) {
  const def = getNodeDef(step.nodeType);
  const NodeIcon = def.icon;
  const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.running;
  const isLLM = step.nodeType === 'LLMNode';
  const duration =
    step.completedAt && step.startedAt
      ? step.completedAt - step.startedAt
      : step.duration;

  const inputTokens = step.tokens?.input || (typeof step.tokens === 'number' ? step.tokens : 0);
  const outputTokens = step.tokens?.output || 0;
  const totalTokens = inputTokens + outputTokens;

  return (
    <div
      className={cn(
        'bg-[var(--glass)] backdrop-blur-md border rounded-xl transition-all duration-200',
        step.status === 'running'
          ? 'border-[var(--amber)]/40 shadow-[0_0_12px_rgba(245,158,11,0.08)]'
          : 'border-[var(--glassBd)]',
      )}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center self-stretch shrink-0">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              step.status === 'running' ? 'animate-pulse' : '',
            )}
            style={{ backgroundColor: `color-mix(in srgb, ${def.color} 20%, transparent)` }}
          >
            <NodeIcon size={14} style={{ color: def.color }} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--hd)] truncate">
              {step.label || def.label}
            </span>
            <StatusBadge status={step.status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[var(--dm)]">
            <span className="flex items-center gap-1">
              <Clock size={9} />
              {fmtDuration(duration)}
            </span>
            {totalTokens > 0 && (
              <span className="flex items-center gap-1">
                <Zap size={9} />
                {isLLM
                  ? `${fmtTokens(inputTokens)} in / ${fmtTokens(outputTokens)} out`
                  : `${fmtTokens(totalTokens)} tokens`}
              </span>
            )}
            {step.nodeType && (
              <span className="text-[var(--dm)] opacity-60">{step.nodeType}</span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <div className="text-[var(--dm)] shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Expanded input / output */}
      {isExpanded && (
        <div className="border-t border-[var(--glassBd)] px-4 py-3 space-y-3">
          {step.input != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--sb)] uppercase tracking-wider mb-1">
                Input
              </p>
              <pre className="bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg p-3 text-[11px] text-[var(--tx)] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}
          {step.output != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--sb)] uppercase tracking-wider mb-1">
                Output
              </p>
              <pre className="bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg p-3 text-[11px] text-[var(--tx)] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
          {step.input == null && step.output == null && (
            <p className="text-[11px] text-[var(--dm)] italic">No input/output data recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MetricCard                                                         */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--dm)] uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-[var(--hd)] truncate">{value}</p>
        {sub && <p className="text-[10px] text-[var(--dm)]">{sub}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HistoryRow                                                         */
/* ------------------------------------------------------------------ */

function HistoryRow({ execution, agentName, isSelected, onSelect }) {
  const duration =
    execution.completedAt && execution.startedAt
      ? execution.completedAt - execution.startedAt
      : null;

  const totalTokens = execution.steps.reduce((sum, s) => {
    if (typeof s.tokens === 'number') return sum + s.tokens;
    if (s.tokens && typeof s.tokens === 'object')
      return sum + (s.tokens.input || 0) + (s.tokens.output || 0);
    return sum;
  }, 0);

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-[var(--blue)]/10 border border-[var(--blue)]/30'
          : 'hover:bg-white/[0.03] border border-transparent',
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          execution.status === 'completed'
            ? 'bg-[var(--green)]'
            : execution.status === 'failed'
              ? 'bg-[var(--red)]'
              : 'bg-[var(--amber)] animate-pulse',
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--tx)] truncate">
          {agentName || 'Unknown Agent'}
        </p>
        <p className="text-[10px] text-[var(--dm)]">
          {execution.startedAt ? timeAgo(execution.startedAt) : '--'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-medium text-[var(--sb)]">{fmtDuration(duration)}</p>
        <p className="text-[10px] text-[var(--dm)]">
          {execution.steps.length} step{execution.steps.length !== 1 ? 's' : ''}
          {totalTokens > 0 && ` \u00B7 ${fmtTokens(totalTokens)} tok`}
        </p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ExecutionMonitor() {
  const { executions, activeExecutionId, isRunning, addStep, completeExecution, failExecution, setActiveExecution } = useExecutionStore();
  const agents = useAgentStore((s) => s.agents);

  /* ---- Local state ---- */
  const [liveTrace, setLiveTrace] = useState([]);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const traceEndRef = useRef(null);

  /* ---- Derived ---- */
  const activeExecution = executions.find((e) => e.id === activeExecutionId);
  const selectedExecution = selectedHistoryId
    ? executions.find((e) => e.id === selectedHistoryId)
    : null;

  // Determine which trace to show: live trace if running, or selected history execution's steps
  const displayTrace = isRunning
    ? liveTrace
    : selectedExecution
      ? selectedExecution.steps.map((s) => ({
          nodeId: s.nodeId,
          nodeType: s.nodeType || null,
          label: s.label,
          status: s.status,
          input: s.input,
          output: s.output,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          duration: s.duration,
          tokens: s.tokens,
        }))
      : activeExecution
        ? activeExecution.steps.map((s) => ({
            nodeId: s.nodeId,
            nodeType: s.nodeType || null,
            label: s.label,
            status: s.status,
            input: s.input,
            output: s.output,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            duration: s.duration,
            tokens: s.tokens,
          }))
        : [];

  const displayExecution = isRunning
    ? activeExecution
    : selectedExecution || activeExecution;

  const agentForDisplay = displayExecution
    ? agents.find((a) => a.id === displayExecution.agentId)
    : null;

  /* ---- Metrics computation ---- */
  const metrics = useMemo(() => {
    const trace = displayTrace;
    if (!trace.length && !liveMetrics) return null;

    // If we have final metrics from execution:complete, use those
    if (!isRunning && liveMetrics && !selectedHistoryId) return liveMetrics;

    const totalTokensIn = trace.reduce((sum, s) => {
      if (typeof s.tokens === 'number') return sum + s.tokens;
      return sum + (s.tokens?.input || 0);
    }, 0);
    const totalTokensOut = trace.reduce((sum, s) => {
      return sum + (s.tokens?.output || 0);
    }, 0);
    const completed = trace.filter((s) => s.status === 'completed').length;
    const failed = trace.filter((s) => s.status === 'failed').length;
    const totalNodes = trace.length;

    let totalTime = null;
    if (displayExecution) {
      if (displayExecution.completedAt && displayExecution.startedAt) {
        totalTime = displayExecution.completedAt - displayExecution.startedAt;
      } else if (isRunning) {
        totalTime = elapsedMs;
      }
    }

    return {
      totalTime,
      totalTokensIn,
      totalTokensOut,
      totalTokens: totalTokensIn + totalTokensOut,
      completed,
      failed,
      totalNodes,
      status: displayExecution?.status || 'unknown',
    };
  }, [displayTrace, displayExecution, elapsedMs, isRunning, liveMetrics, selectedHistoryId]);

  /* ---- Elapsed timer ---- */
  useEffect(() => {
    if (!isRunning || !activeExecution?.startedAt) {
      return;
    }

    const start = activeExecution.startedAt;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, activeExecution?.startedAt]);

  /* ---- Subscribe to execution events ---- */
  useEffect(() => {
    const cleanups = [];

    if (window.electronAPI?.onExecutionStep) {
      const unsub = window.electronAPI.onExecutionStep((data) => {
        setLiveTrace((prev) => {
          const idx = prev.findIndex((s) => s.nodeId === data.nodeId);
          const entry = {
            nodeId: data.nodeId,
            nodeType: data.nodeType || null,
            label: data.label || null,
            status: data.status,
            input: data.input ?? (idx >= 0 ? prev[idx].input : null),
            output: data.output ?? (idx >= 0 ? prev[idx].output : null),
            startedAt: data.startTime || (idx >= 0 ? prev[idx].startedAt : Date.now()),
            completedAt: data.endTime || (data.status === 'completed' || data.status === 'failed' ? Date.now() : null),
            duration: data.endTime && data.startTime ? data.endTime - data.startTime : null,
            tokens: data.tokens || (idx >= 0 ? prev[idx].tokens : 0),
          };

          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...entry };
            return next;
          }
          return [...prev, entry];
        });

        // Also sync to the execution store
        if (data.executionId) {
          addStep(data.executionId, {
            nodeId: data.nodeId,
            nodeType: data.nodeType,
            label: data.label,
            status: data.status,
            input: data.input,
            output: data.output,
            tokens: data.tokens,
          });
        }
      });
      if (unsub) cleanups.push(unsub);
    }

    if (window.electronAPI?.onExecutionComplete) {
      const unsub = window.electronAPI.onExecutionComplete((data) => {
        if (data.metrics) {
          setLiveMetrics({
            totalTime: data.metrics.totalDuration || null,
            totalTokensIn: data.metrics.totalTokensIn || 0,
            totalTokensOut: data.metrics.totalTokensOut || 0,
            totalTokens: (data.metrics.totalTokensIn || 0) + (data.metrics.totalTokensOut || 0),
            completed: data.metrics.successCount || 0,
            failed: data.metrics.failCount || 0,
            totalNodes: data.metrics.nodeCount || 0,
            status: data.success ? 'completed' : 'failed',
          });
        }
        if (data.executionId) {
          completeExecution(data.executionId, data.output);
        }
        // Keep liveTrace visible so user can review after completion
      });
      if (unsub) cleanups.push(unsub);
    }

    if (window.electronAPI?.onExecutionError) {
      const unsub = window.electronAPI.onExecutionError((data) => {
        if (data.executionId) {
          failExecution(data.executionId, data.error);
        }
      });
      if (unsub) cleanups.push(unsub);
    }

    return () => {
      cleanups.forEach((fn) => {
        if (typeof fn === 'function') fn();
      });
    };
  }, [addStep, completeExecution, failExecution]);

  /* ---- Reset live trace when a new execution starts ---- */
  const prevActiveId = useRef(activeExecutionId);
  useEffect(() => {
    if (activeExecutionId && activeExecutionId !== prevActiveId.current) {
      setLiveTrace([]);
      setLiveMetrics(null);
      setExpandedNodes(new Set());
      setSelectedHistoryId(null);
      setElapsedMs(0);
    }
    prevActiveId.current = activeExecutionId;
  }, [activeExecutionId]);

  /* ---- Auto-scroll to newest trace card ---- */
  useEffect(() => {
    if (isRunning && traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [liveTrace.length, isRunning]);

  /* ---- Handlers ---- */
  const toggleExpand = useCallback((nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleStop = useCallback(() => {
    if (window.electronAPI?.stopAgent) {
      window.electronAPI.stopAgent(activeExecutionId);
    }
  }, [activeExecutionId]);

  const handleSelectHistory = useCallback(
    (id) => {
      setSelectedHistoryId((prev) => (prev === id ? null : id));
      setExpandedNodes(new Set());
    },
    [],
  );

  /* ---- Progress for live execution ---- */
  const completedNodes = displayTrace.filter(
    (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped',
  ).length;
  const totalNodes = displayTrace.length;
  const progressPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  /* ---- Past executions (not including the active one if running) ---- */
  const pastExecutions = executions.filter((e) => !(isRunning && e.id === activeExecutionId));

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ---- Header ---- */}
        <div data-tour="monitor-header" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
              <Activity size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--hd)]">Execution Monitor</h1>
              {agentForDisplay && (
                <p className="text-xs text-[var(--dm)]">
                  {agentForDisplay.name}
                  {isRunning && (
                    <span className="text-[var(--amber)] ml-1">&mdash; executing</span>
                  )}
                </p>
              )}
            </div>
          </div>
          {isRunning && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--red)]/15 border border-[var(--red)]/30 text-xs font-medium text-[var(--red)] hover:bg-[var(--red)]/25 transition-colors"
            >
              <Square size={12} />
              Stop Execution
            </button>
          )}
        </div>

        {/* ---- Live Execution Panel ---- */}
        {isRunning && activeExecution && (
          <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--amber)]/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--amber)] opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
                </span>
                <span className="text-xs font-semibold text-[var(--amber)]">Running</span>
                {agentForDisplay && (
                  <span className="text-xs text-[var(--tx)]">&mdash; {agentForDisplay.name}</span>
                )}
              </div>
              <span className="text-xs text-[var(--dm)] font-mono flex items-center gap-1">
                <Timer size={11} />
                {fmtDuration(elapsedMs)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[var(--dm)]">
                <span>
                  {completedNodes} / {totalNodes} node{totalNodes !== 1 ? 's' : ''} completed
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--amber)] transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---- Metrics Summary ---- */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={Timer}
              label="Total Time"
              value={fmtDuration(metrics.totalTime)}
              color="var(--blue)"
            />
            <MetricCard
              icon={Zap}
              label="Tokens Used"
              value={formatNumber(metrics.totalTokens)}
              sub={metrics.totalTokensIn || metrics.totalTokensOut
                ? `${fmtTokens(metrics.totalTokensIn)} in / ${fmtTokens(metrics.totalTokensOut)} out`
                : undefined
              }
              color="var(--purple)"
            />
            <MetricCard
              icon={Cpu}
              label="Nodes"
              value={`${metrics.completed} / ${metrics.totalNodes}`}
              sub={metrics.failed > 0 ? `${metrics.failed} failed` : undefined}
              color="var(--cyan)"
            />
            <MetricCard
              icon={
                metrics.status === 'completed'
                  ? CheckCircle2
                  : metrics.status === 'failed'
                    ? XCircle
                    : metrics.status === 'running'
                      ? Loader2
                      : BarChart3
              }
              label="Status"
              value={
                metrics.status === 'completed'
                  ? 'Success'
                  : metrics.status === 'failed'
                    ? 'Failed'
                    : metrics.status === 'running'
                      ? 'Running'
                      : 'Idle'
              }
              color={
                metrics.status === 'completed'
                  ? 'var(--green)'
                  : metrics.status === 'failed'
                    ? 'var(--red)'
                    : metrics.status === 'running'
                      ? 'var(--amber)'
                      : 'var(--dm)'
              }
            />
          </div>
        )}

        {/* ---- Main content: Trace + History side-by-side ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* ---- Execution Trace ---- */}
          <div data-tour="execution-trace" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--hd)] flex items-center gap-2">
                <BarChart3 size={14} className="text-[var(--sb)]" />
                Execution Trace
              </h2>
              {displayTrace.length > 0 && (
                <span className="text-[10px] text-[var(--dm)]">
                  {displayTrace.length} node{displayTrace.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {displayTrace.length === 0 ? (
              <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-12 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
                  <Activity size={22} className="text-[var(--green)]/50" />
                </div>
                <p className="text-xs text-[var(--dm)] text-center max-w-xs">
                  {isRunning
                    ? 'Waiting for execution steps...'
                    : 'No execution trace to display. Run an agent or select a past execution from the history panel.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Timeline connector line (visual) */}
                <div className="relative space-y-2">
                  {displayTrace.map((step, i) => (
                    <TraceCard
                      key={step.nodeId || i}
                      step={step}
                      isExpanded={expandedNodes.has(step.nodeId || i)}
                      onToggle={() => toggleExpand(step.nodeId || i)}
                    />
                  ))}
                  <div ref={traceEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* ---- History Sidebar ---- */}
          <div data-tour="monitor-history" className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--hd)] flex items-center gap-2">
              <History size={14} className="text-[var(--sb)]" />
              History
            </h2>

            <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl overflow-hidden">
              {pastExecutions.length === 0 ? (
                <div className="p-6 flex flex-col items-center gap-2">
                  <History size={18} className="text-[var(--dm)]/40" />
                  <p className="text-[11px] text-[var(--dm)] text-center">
                    No past executions yet.
                  </p>
                </div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto p-2 space-y-0.5">
                  {pastExecutions.map((ex) => {
                    const agent = agents.find((a) => a.id === ex.agentId);
                    return (
                      <HistoryRow
                        key={ex.id}
                        execution={ex}
                        agentName={agent?.name}
                        isSelected={selectedHistoryId === ex.id}
                        onSelect={() => handleSelectHistory(ex.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
