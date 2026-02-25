import { Sigma } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-data)';

export default function AggregateNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Aggregate'}
      icon={Sigma}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        {data.aggregateOp || 'concatenate'} &middot; {data.aggregateField || 'all fields'}
      </p>
    </BaseNode>
  );
}
