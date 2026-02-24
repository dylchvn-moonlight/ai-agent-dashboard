import { Bot } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-data)';

export default function SubAgentNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Sub-Agent'}
      icon={Bot}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">
          agent
        </span>
        <span className="text-[10px] text-sb truncate">
          {data.agentId || 'Not linked'}
        </span>
      </div>
    </BaseNode>
  );
}
