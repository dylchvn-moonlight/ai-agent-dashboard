import React, { useMemo } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { generateSystemPrompt } from '@/services/prompt-generator';

export default function SystemPromptPreview({ agentConfig }) {
  const [copied, setCopied] = React.useState(false);

  const prompt = useMemo(() => {
    if (!agentConfig?.role || !agentConfig?.industry) return '';
    try {
      return generateSystemPrompt(agentConfig);
    } catch {
      return '(Configure role and industry to generate prompt)';
    }
  }, [agentConfig]);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = prompt ? prompt.split(/\s+/).length : 0;
  const charCount = prompt ? prompt.length : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glassBd)]">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[var(--blue)]" />
          <span className="text-xs font-semibold text-[var(--hd)]">System Prompt Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--dm)]">
            {wordCount} words / {charCount} chars
          </span>
          <button
            onClick={handleCopy}
            disabled={!prompt}
            className="flex items-center gap-1 px-2 py-1 text-[10px] border border-[var(--glassBd)] hover:border-[var(--blue)] disabled:opacity-40 rounded text-[var(--sb)] transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {prompt ? (
          <pre className="text-[11px] text-[var(--tx)] whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[var(--dm)]">
            Configure role and industry to see the generated system prompt
          </div>
        )}
      </div>
    </div>
  );
}
