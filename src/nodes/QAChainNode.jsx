import { MessageCircleQuestion } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-aiproc)';

export default function QAChainNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Q&A Chain'}
      icon={MessageCircleQuestion}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm truncate">
        {data.contextSource || 'upstream'} context &middot; {data.responseStyle || 'detailed'}
      </p>
    </BaseNode>
  );
}
