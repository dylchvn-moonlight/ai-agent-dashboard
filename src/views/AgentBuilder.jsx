import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, Workflow, Loader2, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';
import useFlowStore from '@/stores/flow-store';
import useExecutionStore from '@/stores/execution-store';
import { NODE_DEFINITIONS } from '@/lib/node-types';
import { nodeTypes } from '@/nodes';
import NodePanel from '@/components/NodePanel';
import NodeConfig from '@/components/NodeConfig';

export default function AgentBuilder() {
  const activeAgentId = useUiStore((s) => s.activeAgentId);
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === activeAgentId));
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const startExecution = useExecutionStore((s) => s.startExecution);

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState(null);
  const [showRunDialog, setShowRunDialog] = React.useState(false);
  const [runInput, setRunInput] = React.useState('');

  /* Load agent flow when active agent changes */
  const loadFlow = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);

  React.useEffect(() => {
    if (agent?.flow) {
      loadFlow(agent.flow.nodes || []);
      setEdges(agent.flow.edges || []);
    } else {
      loadFlow([]);
      setEdges([]);
    }
    setSelectedNode(null);
  }, [activeAgentId]);

  /* Handle drag-drop from NodePanel */
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  const onNodeClick = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  /* Save flow to agent */
  const handleSave = useCallback(() => {
    if (!agent) return;
    const state = useFlowStore.getState();
    updateAgent(agent.id, {
      flow: { nodes: state.nodes, edges: state.edges },
    });
    toast.success('Agent saved');
  }, [agent, updateAgent]);

  /* Keyboard shortcuts */
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        const a = useAgentStore.getState().createAgent();
        useUiStore.getState().goToAgent(a.id);
        toast.success('New agent created');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  /* Run the agent */
  const handleRun = useCallback(async () => {
    if (!agent || isRunning) return;

    // Save flow first
    const state = useFlowStore.getState();
    const agentWithFlow = {
      ...agent,
      flow: { nodes: state.nodes, edges: state.edges },
    };
    updateAgent(agent.id, { flow: agentWithFlow.flow });

    startExecution(agent.id);
    setShowRunDialog(false);

    toast.info('Running agent...');

    try {
      const result = await window.electronAPI?.executeAgent(agentWithFlow, runInput);
      if (result?.success) {
        toast.success('Agent execution completed');
      } else {
        toast.error(result?.error || 'Execution failed');
      }
    } catch (err) {
      console.error('Agent execution failed:', err);
      toast.error('Execution failed: ' + (err.message || 'Unknown error'));
    }
    setRunInput('');
  }, [agent, isRunning, runInput, startExecution, updateAgent]);

  /* No agent selected — placeholder */
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--glass)] border border-[var(--glassBd)] flex items-center justify-center">
          <Workflow size={28} className="text-[var(--dm)]" />
        </div>
        <p className="text-sm text-[var(--dm)]">
          Select or create an agent to start building
        </p>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Node Panel */}
      <NodePanel />

      {/* Center: React Flow Canvas */}
      <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--sf)]/60 backdrop-blur-sm border-b border-[var(--glassBd)] z-10">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={agent.name}
              onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
              className="bg-transparent text-sm font-semibold text-[var(--hd)] outline-none border-b border-transparent focus:border-blue-500 transition-colors px-1 py-0.5"
              spellCheck={false}
            />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--dm)] bg-[var(--glass)] border border-[var(--glassBd)]">
              v{agent.version}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--glassBd)] hover:bg-white/5 rounded-lg text-[var(--sb)] transition-colors"
            >
              <Save size={13} />
              Save
            </button>
            <button
              onClick={() => isRunning ? window.electronAPI?.stopAgent() : setShowRunDialog(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Square size={11} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={13} />
                  Run
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'rgba(148,163,184,0.4)', strokeWidth: 2 },
            }}
            className="bg-[var(--bg)]"
          >
            <Background
              variant="dots"
              gap={20}
              size={1}
              color="rgba(148,163,184,0.15)"
            />
            <Controls
              className="!bg-[var(--glass)] !border !border-[var(--glassBd)] !rounded-lg !shadow-lg [&_button]:!bg-transparent [&_button]:!border-[var(--glassBd)] [&_button]:!text-[var(--sb)] [&_button:hover]:!bg-white/5"
            />
            <MiniMap
              nodeColor={(node) => {
                const def = NODE_DEFINITIONS[node.type];
                return def?.color || '#64748B';
              }}
              maskColor="rgba(11,15,26,0.8)"
              className="!bg-[var(--glass)] !border !border-[var(--glassBd)] !rounded-lg"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right: Node Config Panel (shown when a node is selected) */}
      {selectedNode && <NodeConfig node={selectedNode} />}

      {/* Run Input Dialog */}
      {showRunDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--sf)] border border-[var(--glassBd)] rounded-xl shadow-2xl w-[440px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--hd)]">Run Agent</h3>
              <button
                onClick={() => setShowRunDialog(false)}
                className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider">
                Input
              </label>
              <textarea
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="Enter the input for your agent..."
                rows={5}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:border-blue-500/50 resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun();
                }}
              />
              <p className="text-[10px] text-[var(--dm)]">
                Press Ctrl+Enter to run
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRunDialog(false)}
                className="px-3 py-1.5 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Play size={12} />
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
