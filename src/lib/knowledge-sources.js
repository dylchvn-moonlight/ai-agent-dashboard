// knowledge-sources.js — Knowledge source type configurations (8 types)

export const KNOWLEDGE_SOURCE_CONFIGS = {
  business_sheet: {
    type: 'business_sheet',
    label: 'Business Info Sheet',
    icon: '📋',
    description: 'Google Sheet containing business info, services, pricing, hours, and policies',
    n8nNodes: ['n8n-nodes-base.googleSheets'],
    setupSteps: [
      'Create a Google Sheet with tabs: Info, Services, Hours, Policies, FAQs',
      'Populate with business data',
      'Share sheet with n8n service account',
    ],
    requiredCredentials: ['googleSheetsOAuth2Api'],
    configFields: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
      { key: 'sheetName', label: 'Sheet Name', type: 'text', default: 'Sheet1' },
    ],
  },

  website_scrape: {
    type: 'website_scrape',
    label: 'Website Scrape',
    icon: '🌐',
    description: 'Automated scrape of client website for content, FAQs, and service info',
    n8nNodes: ['n8n-nodes-base.httpRequest'],
    setupSteps: [
      'Configure Firecrawl or similar scraping service',
      'Set target URLs for key pages (About, Services, FAQ, Contact)',
      'Schedule periodic refresh to keep data current',
    ],
    requiredCredentials: ['httpHeaderAuth'],
    configFields: [
      { key: 'urls', label: 'URLs to Scrape', type: 'textarea', placeholder: 'One URL per line' },
      { key: 'refreshInterval', label: 'Refresh Interval', type: 'select', options: ['daily', 'weekly', 'monthly'] },
    ],
  },

  document_upload: {
    type: 'document_upload',
    label: 'Document Upload (RAG)',
    icon: '📄',
    description: 'PDF/DOCX files uploaded as knowledge base for RAG retrieval',
    n8nNodes: [
      '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
      '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
      '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
    ],
    setupSteps: [
      'Upload documents to designated storage',
      'Configure vector store for embedding and retrieval',
      'Set up text splitter for chunking documents',
    ],
    requiredCredentials: ['openAiApi'],
    configFields: [
      { key: 'chunkSize', label: 'Chunk Size', type: 'number', default: 1000 },
      { key: 'chunkOverlap', label: 'Chunk Overlap', type: 'number', default: 200 },
    ],
  },

  api_endpoint: {
    type: 'api_endpoint',
    label: 'API Endpoint',
    icon: '🔌',
    description: 'Live API connection for real-time data (inventory, bookings, CRM)',
    n8nNodes: ['n8n-nodes-base.httpRequest'],
    setupSteps: [
      'Document API endpoints and authentication',
      'Create HTTP Request nodes for each endpoint',
      'Map response data to agent-readable format',
    ],
    requiredCredentials: ['httpHeaderAuth'],
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text' },
      { key: 'authHeader', label: 'Auth Header Name', type: 'text', default: 'Authorization' },
    ],
  },

  vector_store: {
    type: 'vector_store',
    label: 'Vector Store',
    icon: '🧠',
    description: 'Pinecone/Supabase vector database for semantic search over documents',
    n8nNodes: [
      '@n8n/n8n-nodes-langchain.vectorStorePinecone',
      '@n8n/n8n-nodes-langchain.retrievervectorstore',
    ],
    setupSteps: [
      'Set up Pinecone index or Supabase vector table',
      'Ingest and embed documents',
      'Configure retriever for semantic search',
    ],
    requiredCredentials: ['pineconeApi'],
    configFields: [
      { key: 'indexName', label: 'Index Name', type: 'text' },
      { key: 'namespace', label: 'Namespace', type: 'text' },
      { key: 'topK', label: 'Top K Results', type: 'number', default: 5 },
    ],
  },

  google_sheets: {
    type: 'google_sheets',
    label: 'Google Sheets (Live)',
    icon: '📊',
    description: 'Live Google Sheet as dynamic data source (leads, inventory, pricing)',
    n8nNodes: ['n8n-nodes-base.googleSheets'],
    setupSteps: [
      'Connect Google Sheets credential',
      'Define sheet structure and columns',
      'Set read/write permissions',
    ],
    requiredCredentials: ['googleSheetsOAuth2Api'],
    configFields: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
      { key: 'sheetName', label: 'Sheet Name', type: 'text', default: 'Sheet1' },
      { key: 'readWrite', label: 'Access Mode', type: 'select', options: ['read', 'readwrite'] },
    ],
  },

  notion: {
    type: 'notion',
    label: 'Notion',
    icon: '📝',
    description: 'Notion database as knowledge base',
    n8nNodes: ['n8n-nodes-base.notion'],
    setupSteps: [
      'Connect Notion API credential',
      'Share relevant databases with integration',
      'Map database properties to agent context',
    ],
    requiredCredentials: ['notionApi'],
    configFields: [
      { key: 'databaseId', label: 'Database ID', type: 'text' },
    ],
  },

  prompt_only: {
    type: 'prompt_only',
    label: 'Prompt Only',
    icon: '💬',
    description: 'All knowledge embedded directly in the system prompt — no external sources',
    n8nNodes: [],
    setupSteps: [
      'Compile all business information into the system prompt',
      'Keep prompt under token limits',
    ],
    requiredCredentials: [],
    configFields: [],
  },
};
