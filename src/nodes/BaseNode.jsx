import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BaseNode({
  children,
  label,
  icon: Icon,
  color = '#3B82F6',
  selected = false,
  status = null,
  handles = { target: true, source: true },
  sourceHandles,
  className,
}) {
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div
      className={cn(
        'relative min-w-[220px] max-w-[280px] rounded-lg',
        'bg-[#111827]/70 backdrop-blur-xl',
        'border transition-all duration-200',
        selected
          ? 'border-transparent shadow-lg'
          : 'border-[rgba(255,255,255,0.06)]',
        className
      )}
      style={{
        '--node-color': color,
        ...(selected && {
          borderColor: color,
          boxShadow: `0 0 20px color-mix(in srgb, ${color} 20%, transparent), 0 0 40px color-mix(in srgb, ${color} 7%, transparent)`,
        }),
        ...(isRunning && {
          borderColor: color,
          boxShadow: `0 0 16px color-mix(in srgb, ${color} 27%, transparent)`,
        }),
      }}
    >
      {/* Running pulse ring */}
      {isRunning && (
        <div
          className="absolute -inset-px rounded-lg animate-ping pointer-events-none"
          style={{
            border: `1.5px solid ${color}`,
            opacity: 0.5,
            animationDuration: '2s',
          }}
        />
      )}

      {/* Status badge */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2 z-10 rounded-full bg-[#111827] p-0.5">
          <CheckCircle2 className="w-4 h-4 text-green" />
        </div>
      )}
      {isFailed && (
        <div className="absolute -top-2 -right-2 z-10 rounded-full bg-[#111827] p-0.5">
          <XCircle className="w-4 h-4 text-red" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-hd truncate">{label}</span>
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 py-2 text-[11px] text-sb space-y-1.5">
          {children}
        </div>
      )}

      {/* Target handle (left) */}
      {handles.target && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !rounded-full !border-2 !border-[#111827] !-left-[6px]"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Source handle(s) (right) */}
      {sourceHandles
        ? sourceHandles.map((sh, idx) => (
            <Handle
              key={sh.id}
              id={sh.id}
              type="source"
              position={Position.Right}
              className="!w-2.5 !h-2.5 !rounded-full !border-2 !border-[#111827] !-right-[6px]"
              style={{
                backgroundColor: color,
                top: `${((idx + 1) / (sourceHandles.length + 1)) * 100}%`,
              }}
            />
          ))
        : handles.source && (
            <Handle
              type="source"
              position={Position.Right}
              className="!w-2.5 !h-2.5 !rounded-full !border-2 !border-[#111827] !-right-[6px]"
              style={{ backgroundColor: color }}
            />
          )}
    </div>
  );
}
