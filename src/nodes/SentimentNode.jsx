import { Smile } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-aiproc)';

export default function SentimentNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Sentiment'}
      icon={Smile}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        Output: {data.outputFormat || 'json'} &middot; {data.granularity || 'document'}
      </p>
    </BaseNode>
  );
}
