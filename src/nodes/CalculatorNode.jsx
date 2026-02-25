import { Calculator } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-tool)';

export default function CalculatorNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Calculator'}
      icon={Calculator}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm font-mono truncate">
        {data.expression || 'No expression'}
      </p>
    </BaseNode>
  );
}
