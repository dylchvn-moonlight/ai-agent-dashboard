import { Table } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-integration)';

export default function GoogleSheetsNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Google Sheets'}
      icon={Table}
      color={COLOR}
      selected={selected}
      status={data.status}
      handles={{ target: true, source: true }}
    >
      <span className="text-[10px] text-[var(--dm)] truncate block">
        {data.operation || 'read'} rows
      </span>
      {data.spreadsheetId && (
        <span className="text-[10px] text-[var(--sb)] truncate block">
          Sheet: {data.sheetName || data.spreadsheetId}
        </span>
      )}
    </BaseNode>
  );
}
