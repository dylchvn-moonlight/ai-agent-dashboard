import React from 'react';
import { NODE_CATEGORIES, NODE_DEFINITIONS } from '@/lib/node-types';

export default function NodePanel() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[240px] h-full bg-[var(--sf)]/80 backdrop-blur-xl border-r border-[var(--glassBd)] overflow-y-auto shrink-0">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[var(--glassBd)]">
        <h3 className="text-xs font-semibold text-[var(--hd)] uppercase tracking-wider">
          Nodes
        </h3>
        <p className="text-[10px] text-[var(--dm)] mt-0.5">
          Drag nodes onto the canvas
        </p>
      </div>

      {/* Node categories */}
      <div className="p-3 space-y-4">
        {Object.entries(NODE_CATEGORIES).map(([categoryName, category]) => (
          <div key={categoryName}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-[10px] font-semibold text-[var(--sb)] uppercase tracking-wider">
                {categoryName}
              </span>
            </div>

            {/* Node items */}
            <div className="space-y-1">
              {category.nodes.map((nodeType) => {
                const def = NODE_DEFINITIONS[nodeType];
                if (!def) return null;

                const Icon = def.icon;

                return (
                  <div
                    key={nodeType}
                    draggable
                    onDragStart={(e) => onDragStart(e, nodeType)}
                    className="group flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-[var(--glassBd)] hover:bg-white/[0.03] transition-all duration-150"
                  >
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5"
                      style={{ backgroundColor: `${def.color}15` }}
                    >
                      <Icon size={14} style={{ color: def.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--tx)] leading-tight">
                        {def.label}
                      </div>
                      <div className="text-[10px] text-[var(--dm)] leading-snug mt-0.5 truncate">
                        {def.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
