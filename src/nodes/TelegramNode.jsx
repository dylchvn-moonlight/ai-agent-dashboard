import { Send } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function TelegramNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Telegram'}
      icon={Send}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'send_message'}
      </span>
      {data.chatId && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          Chat: {data.chatId}
        </span>
      )}
    </BaseNode>
  );
}
