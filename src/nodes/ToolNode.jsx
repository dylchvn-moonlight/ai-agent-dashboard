import { Wrench } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-tool)';

export default function ToolNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Tool'}
      icon={Wrench}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <span className="text-[10px] font-medium text-green bg-green/10 px-1.5 py-0.5 rounded">
        {data.toolType || 'api'}
      </span>
    </BaseNode>
  );
}
