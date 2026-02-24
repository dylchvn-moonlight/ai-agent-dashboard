import React from 'react';
import {
  LayoutDashboard,
  Workflow,
  GraduationCap,
  Activity,
  Rocket,
  Library,
  Settings2,
  PanelLeftClose,
  PanelLeft,
  Search,
  FolderOpen,
} from 'lucide-react';
import useUiStore from '@/stores/ui-store';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'builder', label: 'Agent Builder', icon: Workflow },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'resources', label: 'Resources', icon: Library },
  { id: 'media', label: 'Media Library', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export default function Sidebar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      data-tour="sidebar"
      className="relative flex flex-col h-full bg-[var(--sf)]/80 backdrop-blur-xl border-r border-[var(--glassBd)] transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 60 : 240 }}
    >
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 pt-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={collapsed ? item.label : undefined}
              data-tour={item.id === 'settings' ? 'settings-nav' : undefined}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                transition-all duration-150 text-sm font-medium
                ${isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-[var(--sb)] hover:text-[var(--tx)] hover:bg-white/[0.04]'
                }
              `}
            >
              {/* Active indicator — left blue border */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-500" />
              )}

              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-[var(--dm)] group-hover:text-[var(--sb)]'
                }`}
              />

              {!collapsed && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Command palette trigger */}
      {!collapsed && (
        <div className="px-2 pb-2">
          <button
            onClick={() => useUiStore.getState().setCmdOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[var(--dm)] hover:text-[var(--sb)] hover:bg-white/[0.04] border border-[var(--glassBd)] transition-colors"
          >
            <Search size={13} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono text-[var(--dm)] bg-[var(--bg)] border border-[var(--glassBd)]">
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--dm)] hover:text-[var(--sb)] hover:bg-white/[0.04] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft size={18} />
          ) : (
            <>
              <PanelLeftClose size={18} />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
