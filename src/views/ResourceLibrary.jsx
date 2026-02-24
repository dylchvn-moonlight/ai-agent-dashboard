import React from 'react';
import {
  Library,
  Plus,
  Search,
  Wrench,
  MessageSquare,
  Globe,
  Code,
  FileText,
  Trash2,
  Copy,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import useAgentStore from '@/stores/agent-store';
import { uid, truncate } from '@/lib/utils';

const RESOURCE_TYPES = [
  { id: 'prompt', label: 'Prompt Template', icon: MessageSquare, color: 'var(--purple)' },
  { id: 'tool', label: 'Tool Config', icon: Wrench, color: 'var(--green)' },
  { id: 'scraper', label: 'Scraper Preset', icon: Globe, color: 'var(--blue)' },
  { id: 'code', label: 'Code Snippet', icon: Code, color: 'var(--amber)' },
  { id: 'template', label: 'Agent Template', icon: FileText, color: 'var(--cyan)' },
];

export default function ResourceLibrary() {
  const agents = useAgentStore((s) => s.agents);

  // Resources stored in localStorage for now
  const [resources, setResources] = React.useState(() => {
    try {
      const stored = localStorage.getItem('ai-agent-resources');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [filterType, setFilterType] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  // Form state
  const [formType, setFormType] = React.useState('prompt');
  const [formName, setFormName] = React.useState('');
  const [formContent, setFormContent] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');

  // Persist to localStorage
  React.useEffect(() => {
    localStorage.setItem('ai-agent-resources', JSON.stringify(resources));
  }, [resources]);

  const filtered = resources.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdd = () => {
    if (!formName.trim() || !formContent.trim()) return;

    if (editingId) {
      setResources((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, type: formType, name: formName, content: formContent, description: formDescription, updatedAt: Date.now() }
            : r
        )
      );
      setEditingId(null);
    } else {
      setResources((prev) => [
        {
          id: uid(),
          type: formType,
          name: formName,
          content: formContent,
          description: formDescription,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ...prev,
      ]);
    }

    setFormName('');
    setFormContent('');
    setFormDescription('');
    setShowAddForm(false);
  };

  const handleEdit = (resource) => {
    setEditingId(resource.id);
    setFormType(resource.type);
    setFormName(resource.name);
    setFormContent(resource.content);
    setFormDescription(resource.description || '');
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicate = (resource) => {
    setResources((prev) => [
      {
        ...resource,
        id: uid(),
        name: `${resource.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleSaveAgentAsTemplate = (agent) => {
    setResources((prev) => [
      {
        id: uid(),
        type: 'template',
        name: `${agent.name} Template`,
        content: JSON.stringify(
          { flow: agent.flow, config: agent.config },
          null,
          2
        ),
        description: agent.description || `Template based on ${agent.name}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...prev,
    ]);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--hd)] flex items-center gap-2">
            <Library size={22} className="text-purple-400" />
            Resource Library
          </h1>
          <p className="text-sm text-[var(--dm)] mt-1">
            Reusable prompts, tools, scrapers, code snippets, and agent templates
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormName('');
            setFormContent('');
            setFormDescription('');
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Resource
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dm)]" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          <FilterBtn label="All" active={filterType === 'all'} onClick={() => setFilterType('all')} />
          {RESOURCE_TYPES.map((rt) => (
            <FilterBtn
              key={rt.id}
              label={rt.label.split(' ')[0]}
              active={filterType === rt.id}
              onClick={() => setFilterType(rt.id)}
            />
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[var(--glass)] backdrop-blur-md border border-blue-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--hd)]">
              {editingId ? 'Edit Resource' : 'New Resource'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] outline-none cursor-pointer"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Resource name"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-[var(--sb)] uppercase tracking-wider">Content</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Prompt text, tool config JSON, code snippet..."
              rows={6}
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none resize-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!formName.trim() || !formContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check size={14} />
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="px-3 py-2 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Save Agent as Template */}
      {agents.length > 0 && (
        <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[var(--sb)] uppercase tracking-wider mb-3">
            Save Agent as Template
          </h3>
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSaveAgentAsTemplate(a)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:bg-white/5 text-[var(--sb)] text-xs rounded-lg transition-colors"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resource Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
            <Library size={28} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--hd)] mb-1">
            {resources.length === 0 ? 'No resources yet' : 'No matching resources'}
          </h3>
          <p className="text-xs text-[var(--dm)]">
            {resources.length === 0
              ? 'Add reusable prompts, tool configs, and code snippets.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
          {filtered.map((resource) => {
            const rt = RESOURCE_TYPES.find((t) => t.id === resource.type);
            const Icon = rt?.icon || FileText;
            const color = rt?.color || 'var(--sb)';
            return (
              <div
                key={resource.id}
                className="group bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.1)] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-md"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--hd)]">{resource.name}</div>
                      <div className="text-[10px] text-[var(--dm)]">{rt?.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
                      title="Edit"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(resource)}
                      className="p-1 rounded hover:bg-white/5 text-[var(--dm)]"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-[var(--dm)] hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {resource.description && (
                  <p className="text-[10px] text-[var(--dm)] mb-2 leading-snug">
                    {truncate(resource.description, 100)}
                  </p>
                )}
                <pre className="px-2.5 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-[10px] text-[var(--sb)] font-mono whitespace-pre-wrap max-h-24 overflow-hidden">
                  {truncate(resource.content, 200)}
                </pre>
              </div>
            );
          })}
        </div>
      )}
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
