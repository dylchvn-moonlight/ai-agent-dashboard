import { Shuffle } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-data)';

export default function TransformNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Transform'}
      icon={Shuffle}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <span className="text-[10px] font-medium text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">
        {data.transformType || 'template'}
      </span>
      {data.expression && (
        <p className="text-[10px] text-dm font-mono truncate mt-1">
          {data.expression}
        </p>
      )}
    </BaseNode>
  );
}
