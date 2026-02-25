import { Tags } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-aiproc)';

export default function TextClassifierNode({ data, selected }) {
  const categories = data.categories || [];

  return (
    <BaseNode
      label={data.label || 'Text Classifier'}
      icon={Tags}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm truncate">
        {categories.length > 0
          ? categories.join(', ')
          : 'No categories defined'}
      </p>
    </BaseNode>
  );
}
