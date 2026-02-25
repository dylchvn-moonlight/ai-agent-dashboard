import { Merge } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function MergeNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Merge'}
      icon={Merge}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        Mode: {data.mergeMode || 'append'}
      </p>
    </BaseNode>
  );
}
