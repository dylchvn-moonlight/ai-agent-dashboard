import React from 'react';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Workflow,
  GraduationCap,
  Activity,
  Rocket,
  Library,
  Settings2,
  Plus,
  Search,
  Bot,
  Sun,
  Moon,
  Trash2,
  Copy,
  Play,
} from 'lucide-react';
import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigation' },
  { id: 'builder', label: 'Go to Agent Builder', icon: Workflow, group: 'Navigation' },
  { id: 'training', label: 'Go to Training Studio', icon: GraduationCap, group: 'Navigation' },
  { id: 'monitor', label: 'Go to Execution Monitor', icon: Activity, group: 'Navigation' },
  { id: 'deploy', label: 'Go to Deployment Center', icon: Rocket, group: 'Navigation' },
  { id: 'resources', label: 'Go to Resource Library', icon: Library, group: 'Navigation' },
  { id: 'settings', label: 'Go to Settings', icon: Settings2, group: 'Navigation' },
];

export default function CommandPalette() {
  const cmdOpen = useUiStore((s) => s.cmdOpen);
  const setCmdOpen = useUiStore((s) => s.setCmdOpen);
  const setView = useUiStore((s) => s.setView);
  const goToAgent = useUiStore((s) => s.goToAgent);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const agents = useAgentStore((s) => s.agents);
  const createAgent = useAgentStore((s) => s.createAgent);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(!cmdOpen);
      }
      if (e.key === 'Escape' && cmdOpen) {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, setCmdOpen]);

  if (!cmdOpen) return null;

  const handleSelect = (action) => {
    setCmdOpen(false);

    if (action === 'new-agent') {
      const agent = createAgent();
      goToAgent(agent.id);
      return;
    }

    if (action === 'toggle-theme') {
      toggleTheme();
      return;
    }

    if (action.startsWith('agent:')) {
      goToAgent(action.replace('agent:', ''));
      return;
    }

    // Navigation
    const nav = NAV_ITEMS.find((n) => n.id === action);
    if (nav) {
      setView(nav.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCmdOpen(false)}
      />

      {/* Command dialog */}
      <div className="relative w-[520px] max-h-[400px] bg-[var(--sf)] border border-[var(--glassBd)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
        <Command
          label="Command palette"
          className="[&_[cmdk-root]]:bg-transparent"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glassBd)]">
            <Search size={16} className="text-[var(--dm)] shrink-0" />
            <Command.Input
              placeholder="Search commands, agents, views..."
              className="flex-1 bg-transparent text-sm text-[var(--tx)] placeholder:text-[var(--dm)] outline-none"
              autoFocus
            />
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--dm)] bg-[var(--bg)] border border-[var(--glassBd)]">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-xs text-[var(--dm)]">
              No results found.
            </Command.Empty>

            {/* Actions */}
            <Command.Group
              heading={
                <span className="px-2 text-[10px] font-semibold text-[var(--dm)] uppercase tracking-wider">
                  Actions
                </span>
              }
            >
              <CommandItem
                icon={Plus}
                label="Create New Agent"
                shortcut="Ctrl+N"
                onSelect={() => handleSelect('new-agent')}
              />
              <CommandItem
                icon={theme === 'dark' ? Sun : Moon}
                label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                onSelect={() => handleSelect('toggle-theme')}
              />
            </Command.Group>

            {/* Navigation */}
            <Command.Group
              heading={
                <span className="px-2 text-[10px] font-semibold text-[var(--dm)] uppercase tracking-wider">
                  Navigation
                </span>
              }
            >
              {NAV_ITEMS.map((item) => (
                <CommandItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onSelect={() => handleSelect(item.id)}
                />
              ))}
            </Command.Group>

            {/* Agents */}
            {agents.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-[10px] font-semibold text-[var(--dm)] uppercase tracking-wider">
                    Agents
                  </span>
                }
              >
                {agents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    icon={Bot}
                    label={agent.name}
                    description={agent.description || agent.status}
                    color={agent.color}
                    onSelect={() => handleSelect(`agent:${agent.id}`)}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({ icon: Icon, label, description, shortcut, color, onSelect }) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-[var(--tx)] data-[selected=true]:bg-blue-500/10 data-[selected=true]:text-blue-400 transition-colors"
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
        style={{ backgroundColor: color ? `${color}15` : 'rgba(148,163,184,0.08)' }}
      >
        <Icon size={14} style={color ? { color } : undefined} className={color ? '' : 'text-[var(--sb)]'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{label}</div>
        {description && (
          <div className="text-[10px] text-[var(--dm)] truncate">{description}</div>
        )}
      </div>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--dm)] bg-[var(--bg)] border border-[var(--glassBd)] shrink-0">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
