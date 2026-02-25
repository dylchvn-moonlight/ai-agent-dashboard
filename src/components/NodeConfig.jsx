import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { NODE_DEFINITIONS } from '@/lib/node-types';
import useFlowStore from '@/stores/flow-store';

export default function NodeConfig({ node }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  const def = NODE_DEFINITIONS[node.type];
  const color = def?.color || '#3B82F6';
  const Icon = def?.icon;

  const update = (key, value) => {
    updateNodeData(node.id, { [key]: value });
  };

  return (
    <div className="w-[320px] h-full bg-[var(--sf)]/80 backdrop-blur-xl border-l border-[var(--glassBd)] overflow-y-auto shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glassBd)]">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className="flex items-center justify-center w-6 h-6 rounded"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon size={13} style={{ color }} />
            </div>
          )}
          <h3 className="text-sm font-semibold text-[var(--hd)]">
            {def?.label || node.type} Config
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              removeNode(node.id);
              setSelectedNode(null);
            }}
            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--dm)] hover:text-red-400 transition-colors"
            title="Delete node"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1.5 rounded hover:bg-white/5 text-[var(--dm)] hover:text-[var(--tx)] transition-colors"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Config form */}
      <div className="p-4 space-y-4">
        {/* Label — always shown */}
        <Field label="Label">
          <TextInput
            value={node.data.label || ''}
            onChange={(v) => update('label', v)}
            placeholder="Node label"
          />
        </Field>

        {/* Type-specific fields */}
        {node.type === 'LLMNode' && <LLMFields data={node.data} update={update} />}
        {node.type === 'ScraperNode' && <ScraperFields data={node.data} update={update} />}
        {node.type === 'HTTPNode' && <HTTPFields data={node.data} update={update} />}
        {node.type === 'ConditionNode' && <ConditionFields data={node.data} update={update} />}
        {node.type === 'CodeNode' && <CodeFields data={node.data} update={update} />}
        {node.type === 'InputNode' && <InputFields data={node.data} update={update} />}
        {node.type === 'OutputNode' && <OutputFields data={node.data} update={update} />}
        {node.type === 'MemoryNode' && <MemoryFields data={node.data} update={update} />}
        {node.type === 'LoopNode' && <LoopFields data={node.data} update={update} />}
        {node.type === 'RouterNode' && <RouterFields data={node.data} update={update} />}
        {node.type === 'TransformNode' && <TransformFields data={node.data} update={update} />}
        {node.type === 'SubAgentNode' && <SubAgentFields data={node.data} update={update} />}
        {node.type === 'ToolNode' && <ToolFields data={node.data} update={update} />}
        {node.type === 'EmailNode' && <EmailFields data={node.data} update={update} />}
        {node.type === 'PDFNode' && <PDFFields data={node.data} update={update} />}
        {node.type === 'DocxNode' && <DocxFields data={node.data} update={update} />}
        {node.type === 'BlogNode' && <BlogFields data={node.data} update={update} />}
        {node.type === 'VideoNode' && <VideoFields data={node.data} update={update} />}
        {/* v0.4.2 — Flow Control */}
        {node.type === 'SwitchNode' && <SwitchFields data={node.data} update={update} />}
        {node.type === 'FilterNode' && <FilterFields data={node.data} update={update} />}
        {node.type === 'SplitNode' && <SplitFields data={node.data} update={update} />}
        {node.type === 'MergeNode' && <MergeFields data={node.data} update={update} />}
        {node.type === 'WaitNode' && <WaitFields data={node.data} update={update} />}
        {/* v0.4.2 — AI Processing */}
        {node.type === 'TextClassifierNode' && <TextClassifierFields data={node.data} update={update} />}
        {node.type === 'SentimentNode' && <SentimentFields data={node.data} update={update} />}
        {node.type === 'InfoExtractorNode' && <InfoExtractorFields data={node.data} update={update} />}
        {node.type === 'SummarizerNode' && <SummarizerFields data={node.data} update={update} />}
        {node.type === 'QAChainNode' && <QAChainFields data={node.data} update={update} />}
        {/* v0.4.2 — Triggers */}
        {node.type === 'ScheduleTriggerNode' && <ScheduleTriggerFields data={node.data} update={update} />}
        {node.type === 'WebhookTriggerNode' && <WebhookTriggerFields data={node.data} update={update} />}
        {node.type === 'ChatTriggerNode' && <ChatTriggerFields data={node.data} update={update} />}
        {/* v0.4.2 — Data & Tools */}
        {node.type === 'SortNode' && <SortFields data={node.data} update={update} />}
        {node.type === 'AggregateNode' && <AggregateFields data={node.data} update={update} />}
        {node.type === 'DeduplicateNode' && <DeduplicateFields data={node.data} update={update} />}
        {node.type === 'CalculatorNode' && <CalculatorFields data={node.data} update={update} />}
        {node.type === 'SearchNode' && <SearchFields data={node.data} update={update} />}
        {node.type === 'WikipediaNode' && <WikipediaFields data={node.data} update={update} />}
      </div>
    </div>
  );
}

/* ─── Type-Specific Field Groups ─── */

function LLMFields({ data, update }) {
  return (
    <>
      <Field label="Provider">
        <SelectInput
          value={data.provider || 'claude'}
          onChange={(v) => update('provider', v)}
          options={[
            { value: 'claude', label: 'Claude (Anthropic)' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'kimi', label: 'Kimi (Moonshot)' },
            { value: 'minimax', label: 'MiniMax' },
            { value: 'local', label: 'Local / Custom' },
          ]}
        />
      </Field>
      <Field label="Model">
        <TextInput
          value={data.model || ''}
          onChange={(v) => update('model', v)}
          placeholder="e.g. claude-sonnet-4-6"
        />
      </Field>
      <Field label="System Prompt">
        <TextArea
          value={data.systemPrompt || ''}
          onChange={(v) => update('systemPrompt', v)}
          placeholder="Instructions for the AI model..."
          rows={5}
        />
      </Field>
      <Field label={`Temperature: ${data.temperature ?? 0.7}`}>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={data.temperature ?? 0.7}
          onChange={(e) => update('temperature', parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-[var(--bd)] accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--dm)] mt-1">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </Field>
      <Field label="Max Tokens">
        <TextInput
          type="number"
          value={data.maxTokens ?? 4096}
          onChange={(v) => update('maxTokens', parseInt(v) || 4096)}
          placeholder="4096"
        />
      </Field>
    </>
  );
}

function ScraperFields({ data, update }) {
  return (
    <>
      <Field label="URL">
        <TextInput
          value={data.url || ''}
          onChange={(v) => update('url', v)}
          placeholder="https://example.com"
        />
      </Field>
      <Field label="CSS Selector (optional)">
        <TextInput
          value={data.selector || ''}
          onChange={(v) => update('selector', v)}
          placeholder="e.g. .article-content, #main"
        />
      </Field>
      <Field label="Output Format">
        <SelectInput
          value={data.format || 'markdown'}
          onChange={(v) => update('format', v)}
          options={[
            { value: 'markdown', label: 'Markdown' },
            { value: 'text', label: 'Plain Text' },
            { value: 'html', label: 'HTML' },
            { value: 'json', label: 'JSON' },
          ]}
        />
      </Field>
    </>
  );
}

function HTTPFields({ data, update }) {
  return (
    <>
      <Field label="Method">
        <SelectInput
          value={data.method || 'GET'}
          onChange={(v) => update('method', v)}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'PATCH', label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
        />
      </Field>
      <Field label="URL">
        <TextInput
          value={data.url || ''}
          onChange={(v) => update('url', v)}
          placeholder="https://api.example.com/endpoint"
        />
      </Field>
      <Field label="Headers (JSON)">
        <TextArea
          value={typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers || {}, null, 2)}
          onChange={(v) => {
            try {
              update('headers', JSON.parse(v));
            } catch {
              update('headers', v);
            }
          }}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
          mono
        />
      </Field>
      <Field label="Body (JSON)">
        <TextArea
          value={typeof data.body === 'string' ? data.body : JSON.stringify(data.body || '', null, 2)}
          onChange={(v) => {
            try {
              update('body', JSON.parse(v));
            } catch {
              update('body', v);
            }
          }}
          placeholder='{"key": "value"}'
          rows={4}
          mono
        />
      </Field>
    </>
  );
}

function ConditionFields({ data, update }) {
  return (
    <>
      <Field label="True Branch Label">
        <TextInput
          value={data.trueLabel || 'Yes'}
          onChange={(v) => update('trueLabel', v)}
        />
      </Field>
      <Field label="False Branch Label">
        <TextInput
          value={data.falseLabel || 'No'}
          onChange={(v) => update('falseLabel', v)}
        />
      </Field>
      <Field label="Condition Logic">
        <TextArea
          value={
            Array.isArray(data.conditions)
              ? JSON.stringify(data.conditions, null, 2)
              : ''
          }
          onChange={(v) => {
            try {
              update('conditions', JSON.parse(v));
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
          placeholder='[{"field":"status","operator":"eq","value":"active"}]'
          rows={4}
          mono
        />
      </Field>
    </>
  );
}

function CodeFields({ data, update }) {
  return (
    <>
      <Field label="Language">
        <SelectInput
          value={data.language || 'javascript'}
          onChange={(v) => update('language', v)}
          options={[
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
          ]}
        />
      </Field>
      <Field label="Code">
        <TextArea
          value={data.code || ''}
          onChange={(v) => update('code', v)}
          placeholder="// Write your code here..."
          rows={8}
          mono
        />
      </Field>
    </>
  );
}

function InputFields({ data, update }) {
  return (
    <>
      <Field label="Input Type">
        <SelectInput
          value={data.inputType || 'text'}
          onChange={(v) => update('inputType', v)}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'json', label: 'JSON' },
            { value: 'file', label: 'File' },
            { value: 'webhook', label: 'Webhook' },
          ]}
        />
      </Field>
      <Field label="Description">
        <TextArea
          value={data.description || ''}
          onChange={(v) => update('description', v)}
          placeholder="Describe the expected input..."
          rows={3}
        />
      </Field>
    </>
  );
}

function OutputFields({ data, update }) {
  return (
    <Field label="Output Format">
      <SelectInput
        value={data.outputFormat || 'text'}
        onChange={(v) => update('outputFormat', v)}
        options={[
          { value: 'text', label: 'Text' },
          { value: 'json', label: 'JSON' },
          { value: 'markdown', label: 'Markdown' },
          { value: 'html', label: 'HTML' },
        ]}
      />
    </Field>
  );
}

function MemoryFields({ data, update }) {
  return (
    <>
      <Field label="Memory Type">
        <SelectInput
          value={data.memoryType || 'buffer'}
          onChange={(v) => update('memoryType', v)}
          options={[
            { value: 'buffer', label: 'Buffer (recent messages)' },
            { value: 'vector', label: 'Vector Store' },
            { value: 'long_term', label: 'Long-Term' },
          ]}
        />
      </Field>
      <Field label="Max Messages">
        <TextInput
          type="number"
          value={data.maxMessages ?? 20}
          onChange={(v) => update('maxMessages', parseInt(v) || 20)}
          placeholder="20"
        />
      </Field>
    </>
  );
}

function LoopFields({ data, update }) {
  return (
    <>
      <Field label="Max Iterations">
        <TextInput
          type="number"
          value={data.maxIterations ?? 10}
          onChange={(v) => update('maxIterations', parseInt(v) || 10)}
          placeholder="10"
        />
      </Field>
      <Field label="Stop Condition">
        <TextInput
          value={data.stopCondition || ''}
          onChange={(v) => update('stopCondition', v)}
          placeholder="Expression to stop loop..."
        />
      </Field>
    </>
  );
}

function RouterFields({ data, update }) {
  return (
    <Field label="Routes (JSON)">
      <TextArea
        value={JSON.stringify(data.routes || [], null, 2)}
        onChange={(v) => {
          try {
            update('routes', JSON.parse(v));
          } catch {
            /* ignore invalid JSON while typing */
          }
        }}
        placeholder='[{"label":"Route A","condition":""}]'
        rows={5}
        mono
      />
    </Field>
  );
}

function TransformFields({ data, update }) {
  return (
    <>
      <Field label="Transform Type">
        <SelectInput
          value={data.transformType || 'template'}
          onChange={(v) => update('transformType', v)}
          options={[
            { value: 'template', label: 'Template' },
            { value: 'map', label: 'Map' },
            { value: 'filter', label: 'Filter' },
            { value: 'reduce', label: 'Reduce' },
          ]}
        />
      </Field>
      <Field label="Expression">
        <TextArea
          value={data.expression || ''}
          onChange={(v) => update('expression', v)}
          placeholder="Transform expression..."
          rows={4}
          mono
        />
      </Field>
    </>
  );
}

function SubAgentFields({ data, update }) {
  return (
    <>
      <Field label="Agent ID">
        <TextInput
          value={data.agentId || ''}
          onChange={(v) => update('agentId', v)}
          placeholder="ID of the agent to call"
        />
      </Field>
      <Field label="Input Mapping (JSON)">
        <TextArea
          value={JSON.stringify(data.inputMapping || {}, null, 2)}
          onChange={(v) => {
            try {
              update('inputMapping', JSON.parse(v));
            } catch {
              /* ignore */
            }
          }}
          placeholder='{"param": "{{input.field}}"}'
          rows={3}
          mono
        />
      </Field>
    </>
  );
}

function ToolFields({ data, update }) {
  return (
    <>
      <Field label="Tool Type">
        <SelectInput
          value={data.toolType || 'api'}
          onChange={(v) => update('toolType', v)}
          options={[
            { value: 'api', label: 'API' },
            { value: 'scraper', label: 'Scraper' },
            { value: 'code', label: 'Code' },
            { value: 'file', label: 'File' },
            { value: 'database', label: 'Database' },
          ]}
        />
      </Field>
      <Field label="Config (JSON)">
        <TextArea
          value={JSON.stringify(data.config || {}, null, 2)}
          onChange={(v) => {
            try {
              update('config', JSON.parse(v));
            } catch {
              /* ignore */
            }
          }}
          placeholder='{"endpoint": "..."}'
          rows={4}
          mono
        />
      </Field>
    </>
  );
}

function EmailFields({ data, update }) {
  return (
    <>
      <Field label="To">
        <TextInput
          value={data.to || ''}
          onChange={(v) => update('to', v)}
          placeholder="recipient@example.com"
        />
      </Field>
      <Field label="CC">
        <TextInput
          value={data.cc || ''}
          onChange={(v) => update('cc', v)}
          placeholder="cc@example.com"
        />
      </Field>
      <Field label="BCC">
        <TextInput
          value={data.bcc || ''}
          onChange={(v) => update('bcc', v)}
          placeholder="bcc@example.com"
        />
      </Field>
      <Field label="Subject">
        <TextInput
          value={data.subject || ''}
          onChange={(v) => update('subject', v)}
          placeholder="Email subject line"
        />
      </Field>
      <Field label="Body Template">
        <TextArea
          value={data.bodyTemplate || ''}
          onChange={(v) => update('bodyTemplate', v)}
          placeholder="Use {{input}} for upstream content"
          rows={5}
        />
      </Field>
      <Field label="Attach from Upstream">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.attachFromUpstream}
            onChange={(e) => update('attachFromUpstream', e.target.checked)}
            className="rounded border-[var(--glassBd)] bg-[var(--bg)] text-blue-500 focus:ring-blue-500/30"
          />
          <span className="text-xs text-[var(--tx)]">Include upstream output as attachment</span>
        </label>
      </Field>
    </>
  );
}

function PDFFields({ data, update }) {
  return (
    <>
      <Field label="Filename Template">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="output-{{date}}.pdf"
        />
      </Field>
      <Field label="Page Size">
        <SelectInput
          value={data.pageSize || 'A4'}
          onChange={(v) => update('pageSize', v)}
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'Letter', label: 'Letter' },
            { value: 'Legal', label: 'Legal' },
          ]}
        />
      </Field>
      <Field label="Include Header">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.includeHeader}
            onChange={(e) => update('includeHeader', e.target.checked)}
            className="rounded border-[var(--glassBd)] bg-[var(--bg)] text-blue-500 focus:ring-blue-500/30"
          />
          <span className="text-xs text-[var(--tx)]">Add header to each page</span>
        </label>
      </Field>
      {data.includeHeader && (
        <Field label="Header Text">
          <TextInput
            value={data.headerText || ''}
            onChange={(v) => update('headerText', v)}
            placeholder="Header content..."
          />
        </Field>
      )}
      <Field label="Include Footer">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.includeFooter}
            onChange={(e) => update('includeFooter', e.target.checked)}
            className="rounded border-[var(--glassBd)] bg-[var(--bg)] text-blue-500 focus:ring-blue-500/30"
          />
          <span className="text-xs text-[var(--tx)]">Add footer to each page</span>
        </label>
      </Field>
      {data.includeFooter && (
        <Field label="Footer Text">
          <TextInput
            value={data.footerText || ''}
            onChange={(v) => update('footerText', v)}
            placeholder="Footer content..."
          />
        </Field>
      )}
    </>
  );
}

function DocxFields({ data, update }) {
  return (
    <>
      <Field label="Filename Template">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="document-{{date}}.docx"
        />
      </Field>
      <Field label="Document Title">
        <TextInput
          value={data.documentTitle || ''}
          onChange={(v) => update('documentTitle', v)}
          placeholder="Document title"
        />
      </Field>
      <Field label="Font Size">
        <TextInput
          type="number"
          value={data.fontSize ?? 12}
          onChange={(v) => update('fontSize', parseInt(v) || 12)}
          placeholder="12"
        />
      </Field>
      <Field label="Font Family">
        <SelectInput
          value={data.fontFamily || 'Arial'}
          onChange={(v) => update('fontFamily', v)}
          options={[
            { value: 'Arial', label: 'Arial' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Calibri', label: 'Calibri' },
            { value: 'Courier New', label: 'Courier New' },
          ]}
        />
      </Field>
    </>
  );
}

function BlogFields({ data, update }) {
  return (
    <>
      <Field label="Filename Template">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="blog-{{slug}}.html"
        />
      </Field>
      <Field label="Page Title">
        <TextInput
          value={data.pageTitle || ''}
          onChange={(v) => update('pageTitle', v)}
          placeholder="My Blog Post"
        />
      </Field>
      <Field label="CSS Theme">
        <SelectInput
          value={data.cssTheme || 'modern'}
          onChange={(v) => update('cssTheme', v)}
          options={[
            { value: 'minimal', label: 'Minimal' },
            { value: 'modern', label: 'Modern' },
            { value: 'newspaper', label: 'Newspaper' },
          ]}
        />
      </Field>
      <Field label="Meta Description">
        <TextArea
          value={data.metaDescription || ''}
          onChange={(v) => update('metaDescription', v)}
          placeholder="SEO meta description..."
          rows={3}
        />
      </Field>
      <Field label="Table of Contents">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.includeTableOfContents}
            onChange={(e) => update('includeTableOfContents', e.target.checked)}
            className="rounded border-[var(--glassBd)] bg-[var(--bg)] text-blue-500 focus:ring-blue-500/30"
          />
          <span className="text-xs text-[var(--tx)]">Include table of contents</span>
        </label>
      </Field>
    </>
  );
}

function VideoFields({ data, update }) {
  return (
    <>
      <Field label="Filename Template">
        <TextInput
          value={data.filenameTemplate || ''}
          onChange={(v) => update('filenameTemplate', v)}
          placeholder="video-{{date}}.mp4"
        />
      </Field>
      <Field label="Input Type">
        <SelectInput
          value={data.inputType || 'single_image_with_audio'}
          onChange={(v) => update('inputType', v)}
          options={[
            { value: 'single_image_with_audio', label: 'Single Image + Audio' },
            { value: 'images_dir', label: 'Images Directory' },
            { value: 'image_list', label: 'Image List' },
          ]}
        />
      </Field>
      <Field label="Audio Source">
        <TextInput
          value={data.audioSource || ''}
          onChange={(v) => update('audioSource', v)}
          placeholder="Path or URL to audio file"
        />
      </Field>
      <Field label="FPS">
        <TextInput
          type="number"
          value={data.fps ?? 30}
          onChange={(v) => update('fps', parseInt(v) || 30)}
          placeholder="30"
        />
      </Field>
      <Field label="Resolution">
        <SelectInput
          value={data.resolution || '1920x1080'}
          onChange={(v) => update('resolution', v)}
          options={[
            { value: '1920x1080', label: '1920x1080 (1080p)' },
            { value: '1280x720', label: '1280x720 (720p)' },
            { value: '3840x2160', label: '3840x2160 (4K)' },
            { value: '1080x1920', label: '1080x1920 (Vertical)' },
          ]}
        />
      </Field>
      <Field label="Codec">
        <SelectInput
          value={data.codec || 'libx264'}
          onChange={(v) => update('codec', v)}
          options={[
            { value: 'libx264', label: 'H.264 (libx264)' },
            { value: 'libx265', label: 'H.265 (libx265)' },
            { value: 'libvpx-vp9', label: 'VP9 (libvpx-vp9)' },
          ]}
        />
      </Field>
    </>
  );
}

/* ─── v0.4.2 — Flow Control Fields ─── */

function SwitchFields({ data, update }) {
  return (
    <>
      <Field label="Switch Field">
        <TextInput
          value={data.switchField || ''}
          onChange={(v) => update('switchField', v)}
          placeholder="Field name to switch on"
        />
      </Field>
      <Field label="Cases (JSON)">
        <TextArea
          value={JSON.stringify(data.cases || [], null, 2)}
          onChange={(v) => { try { update('cases', JSON.parse(v)); } catch {} }}
          placeholder='[{"label": "Case 1", "value": "foo"}]'
          rows={4}
          mono
        />
      </Field>
    </>
  );
}

function FilterFields({ data, update }) {
  return (
    <>
      <Field label="Filter Expression">
        <TextArea
          value={data.filterExpression || ''}
          onChange={(v) => update('filterExpression', v)}
          placeholder="e.g. item.score > 0.5"
          rows={3}
          mono
        />
      </Field>
      <Field label="Mode">
        <SelectInput
          value={data.filterMode || 'include'}
          onChange={(v) => update('filterMode', v)}
          options={[
            { value: 'include', label: 'Include matching' },
            { value: 'exclude', label: 'Exclude matching' },
          ]}
        />
      </Field>
    </>
  );
}

function SplitFields({ data, update }) {
  return (
    <>
      <Field label="Split Count">
        <TextInput
          type="number"
          value={data.splitCount ?? 2}
          onChange={(v) => update('splitCount', parseInt(v) || 2)}
          placeholder="2"
        />
      </Field>
      <Field label="Split By">
        <SelectInput
          value={data.splitBy || 'items'}
          onChange={(v) => update('splitBy', v)}
          options={[
            { value: 'items', label: 'Array items' },
            { value: 'lines', label: 'Lines' },
            { value: 'chunks', label: 'Fixed chunks' },
          ]}
        />
      </Field>
    </>
  );
}

function MergeFields({ data, update }) {
  return (
    <Field label="Merge Mode">
      <SelectInput
        value={data.mergeMode || 'append'}
        onChange={(v) => update('mergeMode', v)}
        options={[
          { value: 'append', label: 'Append (concatenate)' },
          { value: 'zip', label: 'Zip (pair items)' },
          { value: 'merge', label: 'Deep merge' },
          { value: 'first', label: 'First non-empty' },
        ]}
      />
    </Field>
  );
}

function WaitFields({ data, update }) {
  return (
    <>
      <Field label="Duration">
        <TextInput
          type="number"
          value={data.waitDuration ?? 1}
          onChange={(v) => update('waitDuration', parseFloat(v) || 1)}
          placeholder="1"
        />
      </Field>
      <Field label="Unit">
        <SelectInput
          value={data.waitUnit || 'seconds'}
          onChange={(v) => update('waitUnit', v)}
          options={[
            { value: 'milliseconds', label: 'Milliseconds' },
            { value: 'seconds', label: 'Seconds' },
            { value: 'minutes', label: 'Minutes' },
          ]}
        />
      </Field>
    </>
  );
}

/* ─── v0.4.2 — AI Processing Fields ─── */

function TextClassifierFields({ data, update }) {
  return (
    <>
      <Field label="Categories (comma-separated)">
        <TextInput
          value={(data.categories || []).join(', ')}
          onChange={(v) => update('categories', v.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="positive, negative, neutral"
        />
      </Field>
      <Field label="Multi-Label">
        <SelectInput
          value={data.multiLabel ? 'true' : 'false'}
          onChange={(v) => update('multiLabel', v === 'true')}
          options={[
            { value: 'false', label: 'Single label' },
            { value: 'true', label: 'Multi-label' },
          ]}
        />
      </Field>
    </>
  );
}

function SentimentFields({ data, update }) {
  return (
    <>
      <Field label="Output Format">
        <SelectInput
          value={data.outputFormat || 'json'}
          onChange={(v) => update('outputFormat', v)}
          options={[
            { value: 'json', label: 'JSON (score + label)' },
            { value: 'label', label: 'Label only' },
            { value: 'score', label: 'Score only (-1 to 1)' },
          ]}
        />
      </Field>
      <Field label="Granularity">
        <SelectInput
          value={data.granularity || 'document'}
          onChange={(v) => update('granularity', v)}
          options={[
            { value: 'document', label: 'Whole document' },
            { value: 'sentence', label: 'Per sentence' },
          ]}
        />
      </Field>
    </>
  );
}

function InfoExtractorFields({ data, update }) {
  return (
    <Field label="Fields to Extract (comma-separated)">
      <TextInput
        value={(data.extractionFields || []).join(', ')}
        onChange={(v) => update('extractionFields', v.split(',').map(s => s.trim()).filter(Boolean))}
        placeholder="name, email, phone, company"
      />
    </Field>
  );
}

function SummarizerFields({ data, update }) {
  return (
    <>
      <Field label="Max Words">
        <TextInput
          type="number"
          value={data.maxLength ?? 200}
          onChange={(v) => update('maxLength', parseInt(v) || 200)}
          placeholder="200"
        />
      </Field>
      <Field label="Style">
        <SelectInput
          value={data.summaryStyle || 'concise'}
          onChange={(v) => update('summaryStyle', v)}
          options={[
            { value: 'concise', label: 'Concise' },
            { value: 'detailed', label: 'Detailed' },
            { value: 'bullet_points', label: 'Bullet Points' },
            { value: 'executive', label: 'Executive Summary' },
          ]}
        />
      </Field>
    </>
  );
}

function QAChainFields({ data, update }) {
  return (
    <>
      <Field label="Context Source">
        <SelectInput
          value={data.contextSource || 'upstream'}
          onChange={(v) => update('contextSource', v)}
          options={[
            { value: 'upstream', label: 'From upstream node' },
            { value: 'manual', label: 'Manual context' },
          ]}
        />
      </Field>
      <Field label="Response Style">
        <SelectInput
          value={data.responseStyle || 'detailed'}
          onChange={(v) => update('responseStyle', v)}
          options={[
            { value: 'detailed', label: 'Detailed' },
            { value: 'brief', label: 'Brief' },
            { value: 'citation', label: 'With citations' },
          ]}
        />
      </Field>
    </>
  );
}

/* ─── v0.4.2 — Trigger Fields ─── */

function ScheduleTriggerFields({ data, update }) {
  return (
    <>
      <Field label="Cron Expression">
        <TextInput
          value={data.cronExpression || ''}
          onChange={(v) => update('cronExpression', v)}
          placeholder="0 * * * *"
        />
      </Field>
      <Field label="Timezone">
        <TextInput
          value={data.timezone || 'UTC'}
          onChange={(v) => update('timezone', v)}
          placeholder="UTC"
        />
      </Field>
    </>
  );
}

function WebhookTriggerFields({ data, update }) {
  return (
    <>
      <Field label="HTTP Method">
        <SelectInput
          value={data.webhookMethod || 'POST'}
          onChange={(v) => update('webhookMethod', v)}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
          ]}
        />
      </Field>
      <Field label="Path">
        <TextInput
          value={data.webhookPath || ''}
          onChange={(v) => update('webhookPath', v)}
          placeholder="webhook"
        />
      </Field>
    </>
  );
}

function ChatTriggerFields() {
  return (
    <Field label="Info">
      <p className="text-[11px] text-[var(--dm)]">
        This trigger fires when a chat message is received. No additional configuration needed.
      </p>
    </Field>
  );
}

/* ─── v0.4.2 — Data & Tool Fields ─── */

function SortFields({ data, update }) {
  return (
    <>
      <Field label="Sort Field">
        <TextInput
          value={data.sortField || ''}
          onChange={(v) => update('sortField', v)}
          placeholder="e.g. name, date, score"
        />
      </Field>
      <Field label="Order">
        <SelectInput
          value={data.sortOrder || 'asc'}
          onChange={(v) => update('sortOrder', v)}
          options={[
            { value: 'asc', label: 'Ascending (A-Z, 0-9)' },
            { value: 'desc', label: 'Descending (Z-A, 9-0)' },
          ]}
        />
      </Field>
    </>
  );
}

function AggregateFields({ data, update }) {
  return (
    <>
      <Field label="Operation">
        <SelectInput
          value={data.aggregateOp || 'concatenate'}
          onChange={(v) => update('aggregateOp', v)}
          options={[
            { value: 'concatenate', label: 'Concatenate' },
            { value: 'sum', label: 'Sum' },
            { value: 'average', label: 'Average' },
            { value: 'count', label: 'Count' },
            { value: 'min', label: 'Min' },
            { value: 'max', label: 'Max' },
          ]}
        />
      </Field>
      <Field label="Field">
        <TextInput
          value={data.aggregateField || ''}
          onChange={(v) => update('aggregateField', v)}
          placeholder="Field to aggregate (empty = all)"
        />
      </Field>
    </>
  );
}

function DeduplicateFields({ data, update }) {
  return (
    <Field label="Deduplicate By">
      <TextInput
        value={data.deduplicateField || ''}
        onChange={(v) => update('deduplicateField', v)}
        placeholder="Field name or 'auto'"
      />
    </Field>
  );
}

function CalculatorFields({ data, update }) {
  return (
    <Field label="Expression">
      <TextArea
        value={data.expression || ''}
        onChange={(v) => update('expression', v)}
        placeholder="e.g. (a + b) * 2"
        rows={3}
        mono
      />
    </Field>
  );
}

function SearchFields({ data, update }) {
  return (
    <>
      <Field label="Search Engine">
        <SelectInput
          value={data.searchEngine || 'SerpApi'}
          onChange={(v) => update('searchEngine', v)}
          options={[
            { value: 'SerpApi', label: 'SerpApi (Google)' },
          ]}
        />
      </Field>
      <Field label="Max Results">
        <TextInput
          type="number"
          value={data.maxResults ?? 5}
          onChange={(v) => update('maxResults', parseInt(v) || 5)}
          placeholder="5"
        />
      </Field>
    </>
  );
}

function WikipediaFields({ data, update }) {
  return (
    <>
      <Field label="Language">
        <SelectInput
          value={data.language || 'en'}
          onChange={(v) => update('language', v)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ja', label: 'Japanese' },
          ]}
        />
      </Field>
      <Field label="Sections">
        <SelectInput
          value={data.sections || 'summary'}
          onChange={(v) => update('sections', v)}
          options={[
            { value: 'summary', label: 'Summary only' },
            { value: 'full', label: 'Full article' },
            { value: 'sections', label: 'All section titles' },
          ]}
        />
      </Field>
    </>
  );
}

/* ─── Reusable Form Primitives ─── */

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-[var(--sb)] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:border-blue-500/50 transition-colors"
      spellCheck={false}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, mono = false }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] placeholder:text-[var(--dm)] outline-none focus:border-blue-500/50 transition-colors resize-none ${
        mono ? 'font-mono' : ''
      }`}
      spellCheck={false}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
