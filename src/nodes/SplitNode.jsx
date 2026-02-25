import { Split } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function SplitNode({ data, selected }) {
  const count = data.splitCount || 2;
  const sourceHandles = Array.from({ length: count }, (_, i) => ({
    id: `split-${i}`,
    label: `Out ${i + 1}`,
  }));

  return (
    <BaseNode
      label={data.label || 'Split'}
      icon={Split}
      color={COLOR}
      selected={selected}
      status={data.status}
      sourceHandles={sourceHandles}
    >
      <p className="text-[10px] text-dm">
        Split into {count} stream{count !== 1 ? 's' : ''}
      </p>
    </BaseNode>
  );
}
