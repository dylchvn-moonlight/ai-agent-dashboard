import { AlignLeft } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-aiproc)';

export default function SummarizerNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Summarizer'}
      icon={AlignLeft}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        Max {data.maxLength || 200} words &middot; {data.summaryStyle || 'concise'}
      </p>
    </BaseNode>
  );
}
