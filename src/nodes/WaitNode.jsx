import { Clock } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function WaitNode({ data, selected }) {
  const duration = data.waitDuration || 1;
  const unit = data.waitUnit || 'seconds';

  return (
    <BaseNode
      label={data.label || 'Wait'}
      icon={Clock}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        Pause {duration} {unit}
      </p>
    </BaseNode>
  );
}
