import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-io)';

export default function InputNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Input'}
      icon={MessageSquare}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: false, source: true }}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-blue bg-blue/10">
          {data.inputType || 'text'}
        </span>
        {data.description && (
          <span className="truncate text-dm">{data.description}</span>
        )}
      </div>
    </BaseNode>
  );
}
