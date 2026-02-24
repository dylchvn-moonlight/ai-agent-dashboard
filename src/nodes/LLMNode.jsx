import { Brain } from 'lucide-react';
import BaseNode from './BaseNode';
import { truncate } from '../lib/utils';

const COLOR = 'var(--node-ai)';

export default function LLMNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'LLM'}
      icon={Brain}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-purple bg-purple/10 px-1.5 py-0.5 rounded">
            {data.model || 'claude-sonnet-4-6'}
          </span>
        </div>
        {data.systemPrompt && (
          <p className="text-[10px] text-dm leading-tight italic">
            {truncate(data.systemPrompt, 80)}
          </p>
        )}
      </div>
    </BaseNode>
  );
}
