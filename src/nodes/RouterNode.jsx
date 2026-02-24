import { Route } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function RouterNode({ data, selected }) {
  const routes = data.routes || [];

  const sourceHandles = routes.map((r, i) => ({
    id: `route-${i}`,
    label: r.label || `Route ${i + 1}`,
  }));

  return (
    <BaseNode
      label={data.label || 'Router'}
      icon={Route}
      color={COLOR}
      selected={selected}
      status={data.status}
      sourceHandles={sourceHandles.length > 0 ? sourceHandles : undefined}
    >
      <div className="space-y-1">
        <span className="text-[10px] text-dm">
          {routes.length} route{routes.length !== 1 ? 's' : ''}
        </span>
        {routes.slice(0, 3).map((r, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="text-[10px] text-sb truncate">
              {r.label || `Route ${i + 1}`}
            </span>
          </div>
        ))}
        {routes.length > 3 && (
          <span className="text-[10px] text-dm">+{routes.length - 3} more</span>
        )}
      </div>
    </BaseNode>
  );
}
