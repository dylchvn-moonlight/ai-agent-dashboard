import { ListFilter } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-data)';

export default function DeduplicateNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Deduplicate'}
      icon={ListFilter}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        Key: {data.deduplicateField || 'auto'}
      </p>
    </BaseNode>
  );
}
