import { Repeat } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function LoopNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Loop'}
      icon={Repeat}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-dm">Max iterations:</span>
        <span className="text-[10px] font-semibold text-amber">
          {data.maxIterations ?? 10}
        </span>
      </div>
      {data.stopCondition && (
        <p className="text-[10px] text-dm font-mono truncate">
          stop: {data.stopCondition}
        </p>
      )}
    </BaseNode>
  );
}
