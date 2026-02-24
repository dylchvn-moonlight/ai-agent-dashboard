import { GitBranch } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-flow)';

export default function ConditionNode({ data, selected }) {
  const trueLabel = data.trueLabel || 'Yes';
  const falseLabel = data.falseLabel || 'No';

  const sourceHandles = [
    { id: 'true', label: trueLabel },
    { id: 'false', label: falseLabel },
  ];

  return (
    <BaseNode
      label={data.label || 'Condition'}
      icon={GitBranch}
      color={COLOR}
      selected={selected}
      status={data.status}
      sourceHandles={sourceHandles}
    >
      <div className="flex flex-col gap-1">
        {data.conditions?.length > 0 ? (
          <p className="text-[10px] text-dm font-mono truncate">
            {data.conditions.length} condition{data.conditions.length > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-[10px] text-dm italic">No conditions set</p>
        )}
        <div className="flex items-center justify-end gap-2 pt-0.5">
          <span className="text-[10px] font-medium text-green">{trueLabel}</span>
          <span className="text-[10px] text-dm">/</span>
          <span className="text-[10px] font-medium text-red">{falseLabel}</span>
        </div>
      </div>
    </BaseNode>
  );
}
