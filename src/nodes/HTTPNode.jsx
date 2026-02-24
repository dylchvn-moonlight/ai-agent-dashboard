import { Wifi } from 'lucide-react';
import BaseNode from './BaseNode';
import { truncate } from '../lib/utils';

const COLOR = 'var(--node-tool)';

const METHOD_COLORS = {
  GET: 'text-green bg-green/10',
  POST: 'text-blue bg-blue/10',
  PUT: 'text-amber bg-amber/10',
  PATCH: 'text-amber bg-amber/10',
  DELETE: 'text-red bg-red/10',
};

export default function HTTPNode({ data, selected }) {
  const method = (data.method || 'GET').toUpperCase();
  const methodClass = METHOD_COLORS[method] || 'text-sb bg-sb/10';

  return (
    <BaseNode
      label={data.label || 'HTTP Request'}
      icon={Wifi}
      color={COLOR}
      selected={selected}
      status={data.status}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${methodClass}`}>
          {method}
        </span>
        <span className="text-[10px] text-dm font-mono truncate">
          {data.url ? truncate(data.url, 30) : 'No URL'}
        </span>
      </div>
    </BaseNode>
  );
}
