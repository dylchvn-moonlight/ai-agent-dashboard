import { Youtube } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function YouTubeNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'YouTube'}
      icon={Youtube}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'search'} videos
      </span>
      {data.query && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          {data.query}
        </span>
      )}
    </BaseNode>
  );
}
