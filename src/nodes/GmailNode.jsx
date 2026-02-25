import { Mail } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function GmailNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Gmail'}
      icon={Mail}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'send'} email
      </span>
      {data.to && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          To: {data.to}
        </span>
      )}
    </BaseNode>
  );
}
