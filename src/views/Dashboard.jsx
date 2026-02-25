import React from 'react';
import {
  Plus,
  Bot,
  Zap,
  GraduationCap,
  CloudUpload,
  Layers,
  LayoutTemplate,
} from 'lucide-react';
import useAgentStore from '@/stores/agent-store';
import useUiStore from '@/stores/ui-store';
import AgentCard from '@/components/AgentCard';
import { AGENT_TEMPLATES } from '@/lib/agent-templates';

export default function Dashboard() {
  const agents = useAgentStore((s) => s.agents);
  const createAgent = useAgentStore((s) => s.createAgent);
  const goToAgent = useUiStore((s) => s.goToAgent);
  const [showTemplates, setShowTemplates] = React.useState(false);

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    training: agents.filter((a) => a.status === 'training').length,
    deployed: agents.filter((a) => a.status === 'deployed').length,
  };

  const handleNewAgent = () => {
    const agent = createAgent();
    goToAgent(agent.id);
  };

  const handleSelectTemplate = (template) => {
    const newAgent = createAgent({
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      flow: template.flow,
      config: template.config || {},
    });
    goToAgent(newAgent.id);
    setShowTemplates(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6" data-tour="dashboard-header">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hd)]">AI Agents</h1>
          <p className="text-sm text-[var(--dm)] mt-1">
            Build, train, and deploy intelligent agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-sm font-medium rounded-lg transition-colors"
          >
            <LayoutTemplate size={16} />
            Browse Templates
          </button>
          <button
            onClick={handleNewAgent}
            data-tour="new-agent-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Agent
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Agents"
          value={stats.total}
          icon={Layers}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={Zap}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label="Training"
          value={stats.training}
          icon={GraduationCap}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
        <StatCard
          label="Deployed"
          value={stats.deployed}
          icon={CloudUpload}
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
        />
      </div>

      {/* Agent Grid or Empty State */}
      {agents.length === 0 ? (
        <EmptyState onCreateAgent={handleNewAgent} onBrowseTemplates={() => setShowTemplates(true)} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Templates Dialog */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--sf)] border border-[var(--glassBd)] rounded-xl shadow-2xl w-[560px] max-h-[80vh] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--hd)]">Agent Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
            <p className="text-xs text-[var(--dm)]">
              Choose a template to create a pre-configured agent with nodes and connections ready to go.
            </p>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[55vh] pr-1">
              {AGENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[var(--glassBd)] hover:border-blue-500/40 hover:bg-white/[0.03] transition-all text-left group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${tpl.color} 15%, transparent)` }}
                  >
                    {tpl.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--hd)] group-hover:text-blue-400 transition-colors">
                      {tpl.name}
                    </p>
                    <p className="text-[10px] text-[var(--dm)] mt-0.5 line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bgColor }) {
  return (
    <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--dm)] uppercase tracking-wider">
          {label}
        </span>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--hd)]">{value}</div>
    </div>
  );
}

function EmptyState({ onCreateAgent, onBrowseTemplates }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
        <Bot size={36} className="text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--hd)] mb-2">
        No agents yet
      </h3>
      <p className="text-sm text-[var(--dm)] mb-6 text-center max-w-sm">
        Create your first AI agent to get started. Design workflows visually,
        train with feedback, and deploy to production.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onBrowseTemplates}
          className="flex items-center gap-2 px-5 py-2.5 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-sm font-medium rounded-lg transition-colors"
        >
          <LayoutTemplate size={16} />
          Browse Templates
        </button>
        <button
          onClick={onCreateAgent}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Create from scratch
        </button>
      </div>
    </div>
  );
}
