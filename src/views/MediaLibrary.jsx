import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  FileText,
  FileType,
  Globe2,
  Video,
  Mail,
  Search,
  Trash2,
  HardDrive,
  Files,
} from 'lucide-react';
import useArtifactStore from '@/stores/artifact-store';
import useAgentStore from '@/stores/agent-store';

const TYPE_CONFIG = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDF', icon: FileText, color: '#ef4444' },
  { id: 'docx', label: 'DOCX', icon: FileType, color: '#3b82f6' },
  { id: 'html', label: 'HTML', icon: Globe2, color: '#22c55e' },
  { id: 'video', label: 'Video', icon: Video, color: '#a855f7' },
  { id: 'email', label: 'Email', icon: Mail, color: '#f59e0b' },
];

function getIconForType(type) {
  const cfg = TYPE_CONFIG.find((t) => t.id === type);
  return cfg?.icon || FileText;
}

function getColorForType(type) {
  const cfg = TYPE_CONFIG.find((t) => t.id === type);
  return cfg?.color || '#6b7280';
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MediaLibrary() {
  const artifacts = useArtifactStore((s) => s.artifacts);
  const loading = useArtifactStore((s) => s.loading);
  const loadArtifacts = useArtifactStore((s) => s.loadArtifacts);
  const openArtifact = useArtifactStore((s) => s.openArtifact);
  const deleteArtifact = useArtifactStore((s) => s.deleteArtifact);
  const agents = useAgentStore((s) => s.agents);

  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  // Listen for new artifacts via push event
  useEffect(() => {
    const handler = (_event, artifact) => {
      useArtifactStore.getState().addArtifact(artifact);
    };
    const cleanup = window.electronAPI?.onArtifactCreated?.(handler);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // Agent lookup map
  const agentMap = useMemo(() => {
    const map = {};
    agents.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [agents]);

  // Filtered artifacts
  const filtered = useMemo(() => {
    return artifacts.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const filename = (a.filename || a.name || '').toLowerCase();
        return filename.includes(q);
      }
      return true;
    });
  }, [artifacts, filterType, searchQuery]);

  // Stats
  const totalCount = artifacts.length;
  const totalStorage = useMemo(
    () => artifacts.reduce((sum, a) => sum + (a.sizeBytes || 0), 0),
    [artifacts]
  );
  const typeCounts = useMemo(() => {
    const counts = {};
    TYPE_CONFIG.forEach((t) => {
      if (t.id !== 'all') counts[t.id] = 0;
    });
    artifacts.forEach((a) => {
      if (counts[a.type] !== undefined) counts[a.type]++;
    });
    return counts;
  }, [artifacts]);

  const handleOpenFolder = () => {
    window.electronAPI?.openArtifactFolder();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteArtifact(id);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hd)] flex items-center gap-2">
            <FolderOpen size={24} className="text-blue-400" />
            Media Library
          </h1>
          <p className="text-sm text-[var(--dm)] mt-1">
            All artifacts generated across your agents
          </p>
        </div>
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--blue)] hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FolderOpen size={16} />
          Open Folder
        </button>
      </div>

      {/* Stats Row */}
      <div data-tour="media-stats" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Files} label="Total Files" value={totalCount} />
        <StatCard icon={HardDrive} label="Storage" value={formatBytes(totalStorage)} />
        {TYPE_CONFIG.filter((t) => t.id !== 'all').map((t) => (
          <StatCard
            key={t.id}
            icon={t.icon}
            label={t.label}
            value={typeCounts[t.id] || 0}
            iconColor={t.color}
          />
        ))}
      </div>

      {/* Filter Bar */}
      <div data-tour="media-filter" className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dm)]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          {TYPE_CONFIG.map((t) => (
            <FilterBtn
              key={t.id}
              label={t.label}
              active={filterType === t.id}
              onClick={() => setFilterType(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--dm)]">Loading artifacts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--hd)] mb-1">
            {artifacts.length === 0 ? 'No artifacts yet' : 'No matching files'}
          </h3>
          <p className="text-xs text-[var(--dm)]">
            {artifacts.length === 0
              ? 'Artifacts created by your agents will appear here.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div data-tour="media-grid" className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filtered.map((artifact) => {
            const Icon = getIconForType(artifact.type);
            const color = getColorForType(artifact.type);
            const agentName = agentMap[artifact.agentId] || 'Unknown Agent';
            const filename = artifact.filename || artifact.name || 'Untitled';

            return (
              <div
                key={artifact.id}
                onClick={() => openArtifact(artifact.id)}
                className="group bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.1)] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--hd)] truncate max-w-[180px]">
                        {filename}
                      </div>
                      <div className="text-[10px] text-[var(--dm)] mt-0.5">
                        {agentName}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, artifact.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--dm)] hover:text-red-400 transition-all"
                    title="Delete artifact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--dm)]">
                  <span>{timeAgo(artifact.createdAt)}</span>
                  <span>{formatBytes(artifact.sizeBytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, iconColor }) {
  return (
    <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={iconColor ? '' : 'text-[var(--dm)]'} style={iconColor ? { color: iconColor } : undefined} />
        <span className="text-[10px] text-[var(--dm)] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-[var(--blue)]">{value}</div>
    </div>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-400'
          : 'text-[var(--dm)] hover:text-[var(--sb)] hover:bg-white/[0.03]'
      }`}
    >
      {label}
    </button>
  );
}
