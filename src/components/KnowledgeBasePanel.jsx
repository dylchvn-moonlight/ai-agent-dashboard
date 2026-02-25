import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import useAssistantStore from '@/stores/assistant-store';

const CATEGORIES = ['General', 'Policies', 'Products', 'Technical', 'HR', 'Other'];

export default function KnowledgeBasePanel({ collapsed, onToggle }) {
  const knowledgeBase = useAssistantStore((s) => s.knowledgeBase);
  const addKnowledge = useAssistantStore((s) => s.addKnowledge);
  const removeKnowledge = useAssistantStore((s) => s.removeKnowledge);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;
    addKnowledge(title.trim(), content.trim(), category);
    setTitle('');
    setContent('');
    setCategory('General');
    setShowForm(false);
  };

  // Group by category
  const grouped = {};
  knowledgeBase.forEach((item) => {
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div
      className={`border-l border-[var(--glassBd)] bg-[var(--sf)]/50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-10' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--glassBd)]">
        <button onClick={onToggle} className="text-[var(--dm)] hover:text-[var(--sb)] transition-colors">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsed && (
          <>
            <BookOpen size={14} className="text-[var(--blue)]" />
            <span className="text-xs font-semibold text-[var(--hd)] flex-1">Knowledge Base</span>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-[var(--dm)] hover:text-blue-400 transition-colors"
              title="Add knowledge"
            >
              <Plus size={14} />
            </button>
          </>
        )}
      </div>

      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Add form */}
          {showForm && (
            <div className="bg-[var(--glass)] rounded-lg p-3 space-y-2 border border-[var(--glassBd)]">
              <input
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:ring-1 focus:ring-blue-500/40"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--tx)] outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <textarea
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:ring-1 focus:ring-blue-500/40"
                placeholder="Content / knowledge..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2 py-1 text-xs text-[var(--dm)] hover:text-[var(--sb)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!title.trim() || !content.trim()}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Knowledge items grouped by category */}
          {knowledgeBase.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <FileText size={24} className="mx-auto text-[var(--dm)] mb-2" />
              <p className="text-xs text-[var(--dm)]">No knowledge added yet</p>
              <p className="text-[10px] text-[var(--dm)] mt-1">
                Add docs, policies, or reference info
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-[var(--dm)] uppercase tracking-wider px-1 mb-1">
                  {cat}
                </p>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[var(--bg)] rounded-lg px-2.5 py-2 mb-1 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium text-[var(--hd)] truncate">{item.title}</p>
                      <button
                        onClick={() => removeKnowledge(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--dm)] hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--dm)] mt-0.5 line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
