import { Globe2 } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function BlogNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Generate Blog'}
      icon={Globe2}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        {data.cssTheme || 'modern'} / .html
      </span>
    </BaseNode>
  );
}
