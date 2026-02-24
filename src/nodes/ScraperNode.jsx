import { Globe } from 'lucide-react';
import BaseNode from './BaseNode';
import { truncate } from '../lib/utils';

const COLOR = 'var(--node-tool)';

export default function ScraperNode({ data, selected }) {
  return (
    <BaseNode
      label={data.label || 'Scraper'}
      icon={Globe}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="space-y-1">
        {data.url ? (
          <p className="text-[10px] text-dm font-mono truncate">
            {truncate(data.url, 40)}
          </p>
        ) : (
          <p className="text-[10px] text-dm italic">No URL set</p>
        )}
        {data.format && (
          <span className="text-[10px] font-medium text-green bg-green/10 px-1.5 py-0.5 rounded">
            {data.format}
          </span>
        )}
      </div>
    </BaseNode>
  );
}
