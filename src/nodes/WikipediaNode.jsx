import { BookOpen } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-tool)';

export default function WikipediaNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Wikipedia'}
      icon={BookOpen}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        {data.language || 'en'} &middot; {data.sections || 'summary'}
      </p>
    </BaseNode>
  );
}
