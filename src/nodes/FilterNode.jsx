import { Filter } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function FilterNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Filter'}
      icon={Filter}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm truncate">
        {data.filterExpression || 'No filter set'}
      </p>
    </BaseNode>
  );
}
