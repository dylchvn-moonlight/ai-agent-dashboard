import { Timer } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-trigger)';

export default function ScheduleTriggerNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Schedule Trigger'}
      icon={Timer}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: false, source: true }}
    >
      <p className="text-[10px] text-dm font-mono truncate">
        {data.cronExpression || '0 * * * *'}
      </p>
    </BaseNode>
  );
}
