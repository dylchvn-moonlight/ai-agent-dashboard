import { Video } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-action)';

export default function VideoNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Create Video'}
      icon={Video}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ color: COLOR, backgroundColor: 'rgba(244,63,94,0.1)' }}>
        {data.resolution || '1920x1080'} / .mp4
      </span>
    </BaseNode>
  );
}
