import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  Play,
  Star,
  CheckCircle2,
  XCircle,
  CircleDot,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  AlertTriangle,
  Bot,
  ClipboardList,
  Save,
} from 'lucide-react';
import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';
import useTrainingStore from '@/stores/training-store';
import { uid, truncate, timeAgo } from '@/lib/utils';

/* ─── helpers ─── */
const GLASS = 'bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl';
const INPUT = 'bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 w-full outline-none focus:border-blue-500/50 transition-colors';
const BTN_PRIMARY = 'bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-40 disabled:pointer-events-none';
const BTN_SECONDARY = 'border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-sm rounded-lg px-3 py-2 transition-colors';

function statusIcon(tc) {
  if (!tc.lastResult) return <CircleDot size={14} className="text-[var(--dm)]" />;
  if (tc.lastResult === 'pass') return <CheckCircle2 size={14} className="text-green-400" />;
  return <XCircle size={14} className="text-red-400" />;
}

function statusLabel(tc) {
  if (!tc.lastResult) return 'Untested';
  return tc.lastResult === 'pass' ? 'Pass' : 'Fail';
}

/* ─── Main Component ─── */
export default function TrainingStudio() {
  const activeAgentId = useUiStore((s) => s.activeAgentId);
  const agents = useAgentStore((s) => s.agents);
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const trainingSessions = useTrainingStore((s) => s.trainingSessions);
  const activeSessionId = useTrainingStore((s) => s.activeSessionId);
  const createSession = useTrainingStore((s) => s.createSession);
  const addRun = useTrainingStore((s) => s.addRun);
  const rateRun = useTrainingStore((s) => s.rateRun);
  const setActiveSession = useTrainingStore((s) => s.setActiveSession);

  const agent = agents.find((a) => a.id === activeAgentId) || null;

  /* local test cases persisted via agent.training.testCases */
  const testCases = useMemo(
    () => agent?.training?.testCases || [],
    [agent],
  );

  const setTestCases = useCallback(
    (next) => {
      if (!agent) return;
      const cases = typeof next === 'function' ? next(testCases) : next;
      updateAgent(agent.id, {
        training: { ...agent.training, testCases: cases },
      });
    },
    [agent, testCases, updateAgent],
  );

  /* ensure an active training session exists for this agent */
  useEffect(() => {
    if (!agent) return;
    const existing = trainingSessions.find(
      (s) => s.agentId === agent.id && s.status === 'active',
    );
    if (existing) {
      if (activeSessionId !== existing.id) setActiveSession(existing.id);
    } else {
      createSession(agent.id);
    }
  }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const session = trainingSessions.find((s) => s.id === activeSessionId) || null;

  /* local UI state */
  const [selectedTcId, setSelectedTcId] = useState(null);
  const [input, setInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [lastRunId, setLastRunId] = useState(null);
  const [resultStatus, setResultStatus] = useState(null); // 'pass' | 'fail' | null
  const [historyOpen, setHistoryOpen] = useState(false);
  const [runMetrics, setRunMetrics] = useState(null);

  /* ── add new test case form state ── */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');

  /* sync selected test case to input fields */
  useEffect(() => {
    const tc = testCases.find((t) => t.id === selectedTcId);
    if (tc) {
      setInput(tc.input);
      setExpectedOutput(tc.expectedOutput || '');
      setOutput('');
      setRating(tc.lastRating || 0);
      setFeedback('');
      setResultStatus(null);
      setRunMetrics(null);
      setLastRunId(null);
    }
  }, [selectedTcId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── handlers ── */
  const handleAddTestCase = () => {
    if (!newInput.trim()) return;
    const tc = {
      id: uid(),
      input: newInput.trim(),
      expectedOutput: newExpected.trim(),
      lastResult: null,
      lastRating: null,
    };
    setTestCases((prev) => [...prev, tc]);
    setNewInput('');
    setNewExpected('');
    setShowAddForm(false);
    setSelectedTcId(tc.id);
  };

  const handleDeleteTestCase = (id) => {
    setTestCases((prev) => prev.filter((t) => t.id !== id));
    if (selectedTcId === id) {
      setSelectedTcId(null);
      setInput('');
      setExpectedOutput('');
      setOutput('');
      setResultStatus(null);
    }
  };

  const handleRunTest = async () => {
    if (!agent || !input.trim() || isRunning) return;
    setIsRunning(true);
    setOutput('');
    setResultStatus(null);
    setRunMetrics(null);
    setRating(0);
    setFeedback('');
    setLastRunId(null);

    try {
      const result = await window.electronAPI.executeAgent(agent, input.trim());

      const agentOutput = result?.output || result?.error || '(no output)';
      setOutput(agentOutput);

      const metrics = result?.metrics || null;
      setRunMetrics(metrics);

      /* determine pass / fail */
      let status = null;
      if (expectedOutput.trim()) {
        const normalise = (s) => s.trim().toLowerCase();
        status =
          normalise(agentOutput).includes(normalise(expectedOutput)) ||
          normalise(expectedOutput).includes(normalise(agentOutput))
            ? 'pass'
            : 'fail';
      }
      setResultStatus(status);

      /* persist run in training store */
      if (session) {
        const entry = addRun(session.id, {
          input: input.trim(),
          output: agentOutput,
          expected: expectedOutput.trim() || null,
          tokens: metrics?.totalTokens || 0,
          latency: metrics?.latencyMs || 0,
        });
        setLastRunId(entry.id);
      }

      /* update test case lastResult */
      if (selectedTcId) {
        setTestCases((prev) =>
          prev.map((t) =>
            t.id === selectedTcId ? { ...t, lastResult: status } : t,
          ),
        );
      }
    } catch (err) {
      setOutput(`Error: ${err.message || 'Execution failed'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveFeedback = () => {
    if (!session || !lastRunId) return;
    rateRun(session.id, lastRunId, rating, feedback);

    /* persist rating on the test case too */
    if (selectedTcId) {
      setTestCases((prev) =>
        prev.map((t) =>
          t.id === selectedTcId ? { ...t, lastRating: rating } : t,
        ),
      );
    }
  };

  /* ── No agent selected ── */
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-amber-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--hd)] mb-1">
            No Agent Selected
          </h2>
          <p className="text-sm text-[var(--dm)] max-w-sm">
            Select an agent from the Dashboard first to begin training and
            testing.
          </p>
        </div>
      </div>
    );
  }

  /* ── session runs for history ── */
  const runs = session?.runs || [];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* ─── Top Agent Bar ─── */}
      <div data-tour="training-agent-bar" className={`${GLASS} px-5 py-3 flex items-center gap-3`}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: (agent.color || '#6366f1') + '18' }}
        >
          <Bot size={18} style={{ color: agent.color || '#6366f1' }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[var(--hd)] truncate">
            Training &mdash; {agent.name}
          </h1>
          <p className="text-xs text-[var(--dm)] truncate">
            {agent.config?.model || 'No model'} &middot; v{agent.version}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[var(--dm)]">
            {testCases.length} test case{testCases.length !== 1 && 's'}
          </span>
          <span className="text-xs text-green-400">
            {testCases.filter((t) => t.lastResult === 'pass').length} passed
          </span>
          <span className="text-xs text-red-400">
            {testCases.filter((t) => t.lastResult === 'fail').length} failed
          </span>
        </div>
      </div>

      {/* ─── Main Panels ─── */}
      <div className="flex gap-4 min-h-[520px]">
        {/* ─── Left: Test Case Manager (40%) ─── */}
        <div data-tour="test-cases" className={`${GLASS} w-[40%] flex flex-col shrink-0`}>
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glassBd)]">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-amber-400" />
              <span className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
                Test Cases
              </span>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* add form (inline) */}
          {showAddForm && (
            <div className="px-4 py-3 border-b border-[var(--glassBd)] space-y-2 bg-white/[0.02]">
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Test input..."
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
              />
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Expected output (optional)..."
                value={newExpected}
                onChange={(e) => setNewExpected(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTestCase}
                  disabled={!newInput.trim()}
                  className={BTN_PRIMARY + ' text-xs !px-3 !py-1.5'}
                >
                  Add Case
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewInput('');
                    setNewExpected('');
                  }}
                  className={BTN_SECONDARY + ' text-xs !px-3 !py-1.5'}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {testCases.length === 0 && !showAddForm ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                <ClipboardList size={28} className="text-[var(--dm)]" />
                <p className="text-xs text-[var(--dm)] text-center">
                  No test cases yet. Add one to start testing your agent.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className={BTN_SECONDARY + ' text-xs'}
                >
                  <Plus size={12} className="inline mr-1" />
                  Add Test Case
                </button>
              </div>
            ) : (
              testCases.map((tc) => (
                <div
                  key={tc.id}
                  onClick={() => setSelectedTcId(tc.id)}
                  className={`
                    flex items-start gap-3 px-4 py-3 border-b border-[var(--glassBd)] cursor-pointer transition-colors
                    ${selectedTcId === tc.id ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'}
                  `}
                >
                  <div className="pt-0.5 shrink-0">{statusIcon(tc)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--tx)] truncate leading-relaxed">
                      {truncate(tc.input, 80)}
                    </p>
                    {tc.expectedOutput && (
                      <p className="text-[11px] text-[var(--dm)] truncate mt-0.5">
                        Expected: {truncate(tc.expectedOutput, 50)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium ${
                        tc.lastResult === 'pass'
                          ? 'text-green-400'
                          : tc.lastResult === 'fail'
                          ? 'text-red-400'
                          : 'text-[var(--dm)]'
                      }`}>
                        {statusLabel(tc)}
                      </span>
                      {tc.lastRating > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                          <Star size={9} fill="currentColor" /> {tc.lastRating}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTestCase(tc.id);
                    }}
                    className="shrink-0 p-1 rounded hover:bg-red-500/10 text-[var(--dm)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Right: Test Runner (60%) ─── */}
        <div data-tour="test-runner" className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Input + Run */}
          <div className={`${GLASS} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
                Test Input
              </span>
              <button
                onClick={handleRunTest}
                disabled={isRunning || !input.trim()}
                className={BTN_PRIMARY + ' flex items-center gap-2'}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {isRunning ? 'Running...' : 'Run Test'}
              </button>
            </div>
            <textarea
              className={INPUT + ' !text-sm'}
              rows={4}
              placeholder="Enter a test input for the agent..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div>
              <label className="text-[11px] text-[var(--dm)] mb-1 block">
                Expected Output (optional - for pass/fail comparison)
              </label>
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Expected output..."
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
              />
            </div>
          </div>

          {/* Running indicator */}
          {isRunning && (
            <div className={`${GLASS} p-4 flex items-center gap-3`}>
              <div className="relative flex items-center justify-center w-8 h-8">
                <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <Loader2 size={18} className="text-blue-400 animate-spin relative" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--hd)]">
                  Executing agent...
                </p>
                <p className="text-[11px] text-[var(--dm)]">
                  Sending input to {agent.name}
                </p>
              </div>
            </div>
          )}

          {/* Output */}
          {output && !isRunning && (
            <div className={`${GLASS} p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
                  Agent Output
                </span>
                {resultStatus && (
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      resultStatus === 'pass'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {resultStatus === 'pass' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {resultStatus === 'pass' ? 'Pass' : 'Fail'}
                  </span>
                )}
              </div>

              <div
                className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap font-mono ${
                  resultStatus === 'pass'
                    ? 'bg-green-500/5 border border-green-500/20 text-green-300'
                    : resultStatus === 'fail'
                    ? 'bg-red-500/5 border border-red-500/20 text-red-300'
                    : 'bg-[var(--bg)] border border-[var(--glassBd)] text-[var(--tx)]'
                }`}
              >
                {output}
              </div>

              {/* expected vs actual on fail */}
              {resultStatus === 'fail' && expectedOutput.trim() && (
                <div className="space-y-2">
                  <p className="text-[11px] text-[var(--dm)] uppercase tracking-wider font-semibold">
                    Expected
                  </p>
                  <div className="rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-[var(--bg)] border border-[var(--glassBd)] text-[var(--sb)]">
                    {expectedOutput}
                  </div>
                </div>
              )}

              {/* metrics */}
              {runMetrics && (
                <div className="flex items-center gap-4 text-[11px] text-[var(--dm)]">
                  {runMetrics.latencyMs != null && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {runMetrics.latencyMs}ms
                    </span>
                  )}
                  {runMetrics.totalTokens != null && (
                    <span>Tokens: {runMetrics.totalTokens}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rating & Feedback */}
          {output && !isRunning && (
            <div className={`${GLASS} p-4 space-y-3`}>
              <span className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
                Rating &amp; Feedback
              </span>

              {/* stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="p-0.5 transition-colors"
                  >
                    <Star
                      size={20}
                      className={
                        n <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-[var(--glassBd)] hover:text-amber-400/50'
                      }
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs text-[var(--dm)] ml-2">
                    {rating}/5
                  </span>
                )}
              </div>

              {/* feedback */}
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Optional feedback on this output..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />

              <button
                onClick={handleSaveFeedback}
                disabled={rating === 0}
                className={BTN_PRIMARY + ' flex items-center gap-2'}
              >
                <Save size={14} />
                Save Feedback
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Session History (collapsible) ─── */}
      <div data-tour="training-history" className={GLASS}>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--sb)]" />
            <span className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
              Session History
            </span>
            <span className="text-[11px] text-[var(--dm)]">
              ({runs.length} run{runs.length !== 1 && 's'})
            </span>
          </div>
          {historyOpen ? (
            <ChevronDown size={14} className="text-[var(--dm)]" />
          ) : (
            <ChevronRight size={14} className="text-[var(--dm)]" />
          )}
        </button>

        {historyOpen && (
          <div className="border-t border-[var(--glassBd)] max-h-64 overflow-y-auto">
            {runs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[var(--dm)]">
                  No runs yet in this session. Execute a test to see history.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--dm)] uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2 text-left font-semibold">Time</th>
                    <th className="px-4 py-2 text-left font-semibold">Input</th>
                    <th className="px-4 py-2 text-left font-semibold">Output</th>
                    <th className="px-4 py-2 text-center font-semibold">Rating</th>
                    <th className="px-4 py-2 text-center font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...runs].reverse().map((run) => {
                    let runStatus = null;
                    if (run.expected) {
                      const norm = (s) => (s || '').trim().toLowerCase();
                      runStatus =
                        norm(run.output).includes(norm(run.expected)) ||
                        norm(run.expected).includes(norm(run.output))
                          ? 'pass'
                          : 'fail';
                    }
                    return (
                      <tr
                        key={run.id}
                        className="border-t border-[var(--glassBd)] hover:bg-white/[0.02] cursor-default"
                        onClick={() => {
                          setInput(run.input);
                          setExpectedOutput(run.expected || '');
                          setOutput(run.output);
                          setRating(run.rating || 0);
                          setFeedback(run.feedback || '');
                          setResultStatus(runStatus);
                          setLastRunId(run.id);
                          setSelectedTcId(null);
                        }}
                      >
                        <td className="px-4 py-2.5 text-[var(--dm)] whitespace-nowrap">
                          {timeAgo(run.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--tx)] max-w-[180px] truncate">
                          {truncate(run.input, 50)}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--sb)] max-w-[200px] truncate">
                          {truncate(run.output, 50)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {run.rating ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-400">
                              <Star size={10} fill="currentColor" />
                              {run.rating}
                            </span>
                          ) : (
                            <span className="text-[var(--dm)]">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {runStatus === 'pass' ? (
                            <CheckCircle2 size={13} className="text-green-400 mx-auto" />
                          ) : runStatus === 'fail' ? (
                            <XCircle size={13} className="text-red-400 mx-auto" />
                          ) : (
                            <span className="text-[var(--dm)]">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
