import { Code } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-tool)';

export default function CodeNode({ data, selected }) {
  const firstLine = data.code
    ? data.code.split('\n').find((l) => l.trim()) || ''
    : '';

  return (
    <BaseNode
      label={data.label || 'Code'}
      icon={Code}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="space-y-1">
        <span className="text-[10px] font-medium text-green bg-green/10 px-1.5 py-0.5 rounded">
          {data.language || 'javascript'}
        </span>
        {firstLine && (
          <p className="text-[10px] text-dm font-mono truncate leading-tight">
            {firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine}
          </p>
        )}
      </div>
    </BaseNode>
  );
}
