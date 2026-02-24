import { Mail } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function EmailNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Send Email'}
      icon={Mail}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.to || 'No recipient set'}
      </span>
      {data.subject && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          {data.subject}
        </span>
      )}
    </BaseNode>
  );
}
