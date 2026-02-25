import { Webhook } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-trigger)';

export default function WebhookTriggerNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Webhook Trigger'}
      icon={Webhook}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: false, source: true }}
    >
      <p className="text-[10px] text-dm truncate">
        {data.webhookMethod || 'POST'} /{data.webhookPath || 'webhook'}
      </p>
    </BaseNode>
  );
}
