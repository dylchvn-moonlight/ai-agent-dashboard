import React from 'react';
import {
  Rocket,
  Globe,
  MessageSquare,
  Package,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';

const DEPLOY_TARGETS = [
  {
    id: 'api',
    label: 'REST API',
    icon: Globe,
    description: 'Deploy as a REST API endpoint that accepts JSON input and returns agent output.',
    color: 'var(--blue)',
    port: 3100,
  },
  {
    id: 'widget',
    label: 'Chat Widget',
    icon: MessageSquare,
    description: 'Generate an embeddable chat widget for websites with customizable styling.',
    color: 'var(--green)',
    port: 3100,
  },
  {
    id: 'sdk',
    label: 'SDK Package',
    icon: Package,
    description: 'Export as a self-contained npm package for integration into Node.js apps.',
    color: 'var(--purple)',
  },
  {
    id: 'cli',
    label: 'CLI Tool',
    icon: Terminal,
    description: 'Package as a command-line tool that accepts piped input or arguments.',
    color: 'var(--amber)',
  },
];

export default function DeploymentCenter() {
  const activeAgentId = useUiStore((s) => s.activeAgentId);
  const agent = useAgentStore((s) =>
    s.agents.find((a) => a.id === activeAgentId)
  );
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const [selectedTarget, setSelectedTarget] = React.useState('api');
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployResult, setDeployResult] = React.useState(null);
  const [copied, setCopied] = React.useState(null);

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
            Select an agent from the Dashboard first to configure deployment.
          </p>
        </div>
      </div>
    );
  }

  const target = DEPLOY_TARGETS.find((t) => t.id === selectedTarget);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);

    // Simulate deployment (actual packaging would be done by a deployment-packager service)
    await new Promise((r) => setTimeout(r, 2000));

    const result = {
      target: selectedTarget,
      timestamp: Date.now(),
      status: 'success',
    };

    if (selectedTarget === 'api') {
      result.endpoint = `http://localhost:${target.port}/api/agent/${agent.id}`;
      result.curlExample = `curl -X POST ${result.endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "Your message here"}'`;
    } else if (selectedTarget === 'widget') {
      result.embedCode = `<script src="http://localhost:${target.port}/widget/${agent.id}.js"></script>\n<div id="agent-chat" data-agent="${agent.id}"></div>`;
    } else if (selectedTarget === 'sdk') {
      result.installCmd = `npm install ./exports/${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent`;
      result.usageCode = `const agent = require('${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent');\nconst result = await agent.run("Your input here");\nconsole.log(result.output);`;
    } else if (selectedTarget === 'cli') {
      result.installCmd = `npm install -g ./exports/${agent.name.toLowerCase().replace(/\s+/g, '-')}-cli`;
      result.usageCode = `echo "Your input" | ${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent\n# or\n${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent --input "Your message"`;
    }

    setDeployResult(result);
    setIsDeploying(false);

    updateAgent(agent.id, {
      deployment: {
        ...agent.deployment,
        lastDeployed: Date.now(),
        target: selectedTarget,
        isDeployed: true,
      },
    });
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--hd)] flex items-center gap-2">
            <Rocket size={22} className="text-blue-400" />
            Deployment Center
          </h1>
          <p className="text-sm text-[var(--dm)] mt-1">
            Package and deploy <span className="text-[var(--tx)] font-medium">{agent.name}</span> for customer integration
          </p>
        </div>
        {agent.deployment?.lastDeployed && (
          <div className="text-xs text-[var(--dm)]">
            Last deployed: {new Date(agent.deployment.lastDeployed).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Deployment Targets */}
      <div className="grid grid-cols-4 gap-3">
        {DEPLOY_TARGETS.map((t) => {
          const Icon = t.icon;
          const isActive = selectedTarget === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTarget(t.id);
                setDeployResult(null);
              }}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left ${
                isActive
                  ? 'bg-[var(--glass)] border-blue-500/30 shadow-lg shadow-blue-500/5'
                  : 'bg-[var(--glass)] border-[var(--glassBd)] hover:border-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg"
                style={{ backgroundColor: `${t.color}15` }}
              >
                <Icon size={18} style={{ color: t.color }} />
              </div>
              <div>
                <div className={`text-sm font-semibold ${isActive ? 'text-[var(--hd)]' : 'text-[var(--sb)]'}`}>
                  {t.label}
                </div>
                <div className="text-[10px] text-[var(--dm)] mt-0.5 leading-snug">
                  {t.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Deploy Action */}
      <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--hd)]">
              Deploy as {target?.label}
            </h3>
            <p className="text-xs text-[var(--dm)] mt-0.5">
              {target?.description}
            </p>
          </div>
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isDeploying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket size={14} />
                Deploy Agent
              </>
            )}
          </button>
        </div>

        {/* Agent info */}
        <div className="flex items-center gap-4 text-xs text-[var(--dm)]">
          <span>Agent: <span className="text-[var(--tx)]">{agent.name}</span></span>
          <span>Version: <span className="text-[var(--tx)]">v{agent.version}</span></span>
          <span>Nodes: <span className="text-[var(--tx)]">{agent.flow?.nodes?.length || 0}</span></span>
          <span>Status: <span className={agent.status === 'active' ? 'text-green-400' : 'text-[var(--sb)]'}>{agent.status}</span></span>
        </div>
      </div>

      {/* Deploy Result */}
      {deployResult && (
        <div className="bg-[var(--glass)] backdrop-blur-md border border-green-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">
              Deployment Successful
            </h3>
          </div>

          {/* API target */}
          {deployResult.endpoint && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">
                  Endpoint
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] font-mono">
                    {deployResult.endpoint}
                  </code>
                  <CopyBtn text={deployResult.endpoint} id="endpoint" copied={copied} onCopy={copyToClipboard} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">
                  Example Usage
                </label>
                <div className="relative">
                  <pre className="px-3 py-2.5 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] font-mono whitespace-pre-wrap overflow-x-auto">
                    {deployResult.curlExample}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyBtn text={deployResult.curlExample} id="curl" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Widget target */}
          {deployResult.embedCode && (
            <div>
              <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">
                Embed Code
              </label>
              <div className="relative">
                <pre className="px-3 py-2.5 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] font-mono whitespace-pre-wrap">
                  {deployResult.embedCode}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyBtn text={deployResult.embedCode} id="embed" copied={copied} onCopy={copyToClipboard} />
                </div>
              </div>
            </div>
          )}

          {/* SDK / CLI target */}
          {deployResult.installCmd && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">
                  Install
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] font-mono">
                    {deployResult.installCmd}
                  </code>
                  <CopyBtn text={deployResult.installCmd} id="install" copied={copied} onCopy={copyToClipboard} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider mb-1">
                  Usage
                </label>
                <div className="relative">
                  <pre className="px-3 py-2.5 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] font-mono whitespace-pre-wrap">
                    {deployResult.usageCode}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyBtn text={deployResult.usageCode} id="usage" copied={copied} onCopy={copyToClipboard} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Agent JSON */}
      <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--hd)]">Export Agent Definition</h3>
            <p className="text-xs text-[var(--dm)] mt-0.5">
              Download the agent's full configuration as a portable JSON file.
            </p>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(agent, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-sm rounded-lg transition-colors"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyBtn({ text, id, copied, onCopy }) {
  const isCopied = copied === id;
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="p-1.5 rounded hover:bg-white/5 text-[var(--dm)] hover:text-[var(--tx)] transition-colors"
      title="Copy"
    >
      {isCopied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}
