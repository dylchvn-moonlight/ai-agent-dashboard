// Agent Templates — pre-built agent configurations for quick-start workflows

export const AGENT_TEMPLATES = [
  {
    name: 'Content Writer',
    description: 'Generate blog posts from a topic. Input feeds an LLM prompt, then renders as styled HTML.',
    icon: '\u270D\uFE0F',
    color: '#8b5cf6',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.8,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'Topic Input', inputType: 'text', description: 'Enter a blog topic or title' },
        },
        {
          id: 'tpl-llm-1',
          type: 'LLMNode',
          position: { x: 300, y: 200 },
          data: {
            label: 'Write Article',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt: 'You are an expert content writer. Write a well-structured blog post in markdown format based on the user\'s topic. Include headings, subheadings, and engaging content.',
            temperature: 0.8,
            maxTokens: 4096,
          },
        },
        {
          id: 'tpl-blog-1',
          type: 'BlogNode',
          position: { x: 550, y: 200 },
          data: { label: 'Render Blog', filenameTemplate: 'blog-{{date}}', cssTheme: 'modern', pageTitle: '', includeTableOfContents: true },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 800, y: 200 },
          data: { label: 'Output', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-llm', source: 'tpl-input-1', target: 'tpl-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-llm-blog', source: 'tpl-llm-1', target: 'tpl-blog-1', type: 'smoothstep', animated: true },
        { id: 'e-blog-output', source: 'tpl-blog-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'Research Agent',
    description: 'Scrape a web page, then summarize and analyze the content with AI.',
    icon: '\uD83D\uDD0D',
    color: '#06b6d4',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.5,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'URL Input', inputType: 'text', description: 'Enter a URL to research' },
        },
        {
          id: 'tpl-scraper-1',
          type: 'ScraperNode',
          position: { x: 300, y: 200 },
          data: { label: 'Scrape Page', url: '', selector: '', format: 'markdown' },
        },
        {
          id: 'tpl-llm-1',
          type: 'LLMNode',
          position: { x: 550, y: 200 },
          data: {
            label: 'Analyze & Summarize',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt: 'You are a research analyst. Analyze the provided web content and produce a clear, structured summary with key findings, main arguments, and relevant data points.',
            temperature: 0.5,
            maxTokens: 4096,
          },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 800, y: 200 },
          data: { label: 'Research Output', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-scraper', source: 'tpl-input-1', target: 'tpl-scraper-1', type: 'smoothstep', animated: true },
        { id: 'e-scraper-llm', source: 'tpl-scraper-1', target: 'tpl-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-llm-output', source: 'tpl-llm-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'Email Automation',
    description: 'Draft an email with AI, check a condition, then send it via SMTP.',
    icon: '\uD83D\uDCE7',
    color: '#f43f5e',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.6,
      maxTokens: 2048,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'Email Brief', inputType: 'text', description: 'Describe what the email should say, who to send it to, etc.' },
        },
        {
          id: 'tpl-llm-1',
          type: 'LLMNode',
          position: { x: 300, y: 200 },
          data: {
            label: 'Draft Email',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt: 'You are a professional email writer. Based on the user\'s brief, draft a polished email with subject line and body. Format as:\nSubject: ...\n\nBody:\n...',
            temperature: 0.6,
            maxTokens: 2048,
          },
        },
        {
          id: 'tpl-condition-1',
          type: 'ConditionNode',
          position: { x: 550, y: 200 },
          data: { label: 'Review Gate', conditions: [], trueLabel: 'Send', falseLabel: 'Skip' },
        },
        {
          id: 'tpl-email-1',
          type: 'EmailNode',
          position: { x: 800, y: 150 },
          data: { label: 'Send Email', to: '', subject: '', bodyTemplate: '{{input}}', attachFromUpstream: false },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 1050, y: 200 },
          data: { label: 'Output', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-llm', source: 'tpl-input-1', target: 'tpl-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-llm-condition', source: 'tpl-llm-1', target: 'tpl-condition-1', type: 'smoothstep', animated: true },
        { id: 'e-condition-email', source: 'tpl-condition-1', target: 'tpl-email-1', type: 'smoothstep', animated: true },
        { id: 'e-email-output', source: 'tpl-email-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'Data Processor',
    description: 'Fetch data from an API, transform it, then output the results.',
    icon: '\u2699\uFE0F',
    color: '#f97316',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.3,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'API Config', inputType: 'text', description: 'Enter API endpoint URL or configuration' },
        },
        {
          id: 'tpl-http-1',
          type: 'HTTPNode',
          position: { x: 300, y: 200 },
          data: { label: 'Fetch Data', method: 'GET', url: '', headers: {}, body: null },
        },
        {
          id: 'tpl-transform-1',
          type: 'TransformNode',
          position: { x: 550, y: 200 },
          data: { label: 'Transform Data', transformType: 'template', expression: '' },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 800, y: 200 },
          data: { label: 'Processed Output', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-http', source: 'tpl-input-1', target: 'tpl-http-1', type: 'smoothstep', animated: true },
        { id: 'e-http-transform', source: 'tpl-http-1', target: 'tpl-transform-1', type: 'smoothstep', animated: true },
        { id: 'e-transform-output', source: 'tpl-transform-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'PDF Report Generator',
    description: 'Use AI to write a report, then export it as a formatted PDF document.',
    icon: '\uD83D\uDCC4',
    color: '#22c55e',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.6,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'Report Topic', inputType: 'text', description: 'Describe the report you want generated' },
        },
        {
          id: 'tpl-llm-1',
          type: 'LLMNode',
          position: { x: 300, y: 200 },
          data: {
            label: 'Write Report',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt: 'You are a report writer. Generate a professional, well-structured report based on the user\'s topic. Include an executive summary, detailed sections, and a conclusion.',
            temperature: 0.6,
            maxTokens: 4096,
          },
        },
        {
          id: 'tpl-pdf-1',
          type: 'PDFNode',
          position: { x: 550, y: 200 },
          data: { label: 'Generate PDF', filenameTemplate: 'report-{{date}}', pageSize: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 }, includeHeader: true, headerText: 'AI Generated Report', includeFooter: true, footerText: 'Page {{page}}' },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 800, y: 200 },
          data: { label: 'Output', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-llm', source: 'tpl-input-1', target: 'tpl-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-llm-pdf', source: 'tpl-llm-1', target: 'tpl-pdf-1', type: 'smoothstep', animated: true },
        { id: 'e-pdf-output', source: 'tpl-pdf-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'Chatbot',
    description: 'Conversational agent with memory. Maintains context across messages.',
    icon: '\uD83E\uDD16',
    color: '#6366f1',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'tpl-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: { label: 'User Message', inputType: 'text', description: 'Type a message to the chatbot' },
        },
        {
          id: 'tpl-memory-1',
          type: 'MemoryNode',
          position: { x: 300, y: 200 },
          data: { label: 'Conversation Memory', memoryType: 'buffer', maxMessages: 20 },
        },
        {
          id: 'tpl-llm-1',
          type: 'LLMNode',
          position: { x: 550, y: 200 },
          data: {
            label: 'Chat LLM',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt: 'You are a helpful, friendly assistant. Use the conversation history provided to maintain context. Be concise but thorough in your responses.',
            temperature: 0.7,
            maxTokens: 4096,
          },
        },
        {
          id: 'tpl-output-1',
          type: 'OutputNode',
          position: { x: 800, y: 200 },
          data: { label: 'Reply', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-input-memory', source: 'tpl-input-1', target: 'tpl-memory-1', type: 'smoothstep', animated: true },
        { id: 'e-memory-llm', source: 'tpl-memory-1', target: 'tpl-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-llm-output', source: 'tpl-llm-1', target: 'tpl-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },

  {
    name: 'YouTube AI Agent Scout',
    description: 'Search YouTube for trending AI videos from the last 24 hours, rank the top 5, and generate an HTML report.',
    icon: '\uD83C\uDFAC',
    color: '#ef4444',
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      temperature: 0.5,
      maxTokens: 4096,
    },
    flow: {
      nodes: [
        {
          id: 'yt-input-1',
          type: 'InputNode',
          position: { x: 50, y: 200 },
          data: {
            label: 'Search Query',
            inputType: 'text',
            description: 'Enter an AI topic to scout (e.g. "AI agents", "LLM news")',
          },
        },
        {
          id: 'yt-scraper-1',
          type: 'ScraperNode',
          position: { x: 300, y: 200 },
          data: {
            label: 'YouTube Search (24h)',
            url: 'https://www.youtube.com/results?search_query={{input}}&sp=EgIIAQ%253D%253D',
            selector: '#contents ytd-video-renderer',
            format: 'text',
          },
        },
        {
          id: 'yt-llm-1',
          type: 'LLMNode',
          position: { x: 550, y: 200 },
          data: {
            label: 'Parse & Rank Top 5',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            systemPrompt:
              'You are a YouTube content analyst specializing in AI topics. ' +
              'From the provided YouTube search results, identify the top 5 most relevant and trending videos. ' +
              'For each video, extract: title, channel name, view count, upload time, and video URL. ' +
              'Rank them by relevance and engagement. ' +
              'Output as a structured list with brief analysis of why each video is noteworthy.',
            temperature: 0.5,
            maxTokens: 4096,
          },
        },
        {
          id: 'yt-blog-1',
          type: 'BlogNode',
          position: { x: 800, y: 200 },
          data: {
            label: 'Format Report',
            filenameTemplate: 'youtube-ai-scout-{{date}}',
            cssTheme: 'modern',
            pageTitle: 'YouTube AI Scout Report',
            includeTableOfContents: false,
          },
        },
        {
          id: 'yt-output-1',
          type: 'OutputNode',
          position: { x: 1050, y: 200 },
          data: { label: 'Scout Report', outputFormat: 'text' },
        },
      ],
      edges: [
        { id: 'e-yt-input-scraper', source: 'yt-input-1', target: 'yt-scraper-1', type: 'smoothstep', animated: true },
        { id: 'e-yt-scraper-llm', source: 'yt-scraper-1', target: 'yt-llm-1', type: 'smoothstep', animated: true },
        { id: 'e-yt-llm-blog', source: 'yt-llm-1', target: 'yt-blog-1', type: 'smoothstep', animated: true },
        { id: 'e-yt-blog-output', source: 'yt-blog-1', target: 'yt-output-1', type: 'smoothstep', animated: true },
      ],
    },
  },
];
