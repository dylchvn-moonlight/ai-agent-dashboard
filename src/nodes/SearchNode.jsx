import { Search } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-tool)';

export default function SearchNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Web Search'}
      icon={Search}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm">
        {data.searchEngine || 'SerpApi'} &middot; {data.maxResults || 5} results
      </p>
    </BaseNode>
  );
}
