import { Database } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-ai)';

export default function MemoryNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Memory'}
      icon={Database}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-purple bg-purple/10 px-1.5 py-0.5 rounded">
          {data.memoryType || 'buffer'}
        </span>
        {data.maxMessages && (
          <span className="text-[10px] text-dm">
            {data.maxMessages} msgs
          </span>
        )}
      </div>
    </BaseNode>
  );
}
