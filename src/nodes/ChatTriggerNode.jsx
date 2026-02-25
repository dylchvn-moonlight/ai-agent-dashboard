import { MessageSquarePlus } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-trigger)';

export default function ChatTriggerNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Chat Trigger'}
      icon={MessageSquarePlus}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: false, source: true }}
    >
      <p className="text-[10px] text-dm">
        Awaiting chat message
      </p>
    </BaseNode>
  );
}
