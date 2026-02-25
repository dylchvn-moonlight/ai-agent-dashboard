import { ArrowLeftRight } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function SwitchNode({ data, selected }) {
  const cases = data.cases || [];
  const sourceHandles = cases.length > 0
    ? cases.map((c, i) => ({ id: `case-${i}`, label: c.label || `Case ${i}` }))
    : [{ id: 'default', label: 'Default' }];

  return (
    <BaseNode
      label={data.label || 'Switch'}
      icon={ArrowLeftRight}
      color={COLOR}
      selected={selected}
      status={data.status}
      sourceHandles={sourceHandles}
    >
      <p className="text-[10px] text-dm">
        {cases.length} case{cases.length !== 1 ? 's' : ''} &middot; {data.switchField || 'value'}
      </p>
    </BaseNode>
  );
}
