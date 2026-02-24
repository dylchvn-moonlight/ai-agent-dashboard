import { Send } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-io)';

export default function OutputNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Output'}
      icon={Send}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: false }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-blue bg-blue/10">
        {data.outputFormat || 'text'}
      </span>
    </BaseNode>
  );
}
