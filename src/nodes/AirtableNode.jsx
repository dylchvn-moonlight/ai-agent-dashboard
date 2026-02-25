import { Database } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function AirtableNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Airtable'}
      icon={Database}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'list'} records
      </span>
      {data.tableName && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          {data.tableName}
        </span>
      )}
    </BaseNode>
  );
}
