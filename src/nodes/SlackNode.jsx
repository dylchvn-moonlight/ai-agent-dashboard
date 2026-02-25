import { Hash } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function SlackNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Slack'}
      icon={Hash}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'send'} message
      </span>
      {data.channel && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          #{data.channel}
        </span>
      )}
    </BaseNode>
  );
}
