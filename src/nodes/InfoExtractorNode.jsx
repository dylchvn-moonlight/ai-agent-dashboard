import { FileSearch } from 'lucide-react';
import BaseNode from './BaseNode';

const COLOR = 'var(--node-aiproc)';

export default function InfoExtractorNode({ data, selected }) {
  const fields = data.extractionFields || [];

  return (
    <BaseNode
      label={data.label || 'Info Extractor'}
      icon={FileSearch}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <p className="text-[10px] text-dm truncate">
        {fields.length > 0
          ? `${fields.length} field${fields.length !== 1 ? 's' : ''}: ${fields.join(', ')}`
          : 'No schema defined'}
      </p>
    </BaseNode>
  );
}
