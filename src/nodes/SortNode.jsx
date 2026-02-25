import { ArrowUpDown } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-data)';

export default function SortNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Sort'}
      icon={ArrowUpDown}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        By: {data.sortField || 'value'} &middot; {data.sortOrder || 'asc'}
      </p>
    </BaseNode>
  );
}
