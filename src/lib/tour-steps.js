/**
 * Central tour definitions keyed by view ID.
 * Each view gets 3-5 steps explaining its purpose and key actions.
 * Targets use [data-tour="..."] selectors which are added to the view components.
 */

export const TOUR_STEPS = {
  dashboard: [
    {
      target: '[data-tour="dashboard-header"]',
      title: 'Dashboard Overview',
      content: 'This is your command center. See all your AI agents, their status, and quick stats at a glance.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-stats"]',
      title: 'Agent Statistics',
      content: 'Track how many agents you have, which are active, in training, or deployed to production.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="new-agent-btn"]',
      title: 'Create an Agent',
      content: 'Click here to create a new AI agent from scratch. You\'ll design its workflow visually in the Agent Builder.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-tour="templates-btn"]',
      title: 'Browse Templates',
      content: 'Start faster with pre-built templates like Content Writer, Research Agent, Email Automation, and more.',
      placement: 'left',
      disableBeacon: true,
    },
  ],

  builder: [
    {
      target: '[data-tour="node-panel"]',
      title: 'Node Palette',
      content: 'Drag nodes from here onto the canvas. Each node type performs a specific action — LLM calls, web scraping, conditions, and more.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="builder-canvas"]',
      title: 'Flow Canvas',
      content: 'This is where you design your agent\'s workflow. Drop nodes here and connect them by dragging from one node\'s output to another\'s input.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="builder-topbar"]',
      title: 'Agent Controls',
      content: 'Name your agent, save your work (Ctrl+S), load templates, or run your agent to test it live.',
      placement: 'bottom',
      disableBeacon: true,
    },
  ],

  training: [
    {
      target: '[data-tour="training-agent-bar"]',
      title: 'Training Agent',
      content: 'This shows which agent you\'re training. Select an agent from the Dashboard first, then come here to test and improve it.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="test-cases"]',
      title: 'Test Cases',
      content: 'Create test cases with expected inputs and outputs. Run them repeatedly to verify your agent performs correctly.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="test-runner"]',
      title: 'Test Runner',
      content: 'Enter test inputs, run them against your agent, and rate the output quality. Your feedback helps track agent performance over time.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-tour="training-history"]',
      title: 'Session History',
      content: 'Review all past test runs in this session — inputs, outputs, ratings, and pass/fail results.',
      placement: 'top',
      disableBeacon: true,
    },
  ],

  monitor: [
    {
      target: '[data-tour="monitor-header"]',
      title: 'Execution Monitor',
      content: 'Watch your agents execute in real-time. See each node\'s input, output, and performance metrics as the flow runs.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="execution-trace"]',
      title: 'Execution Trace',
      content: 'Each card represents a node in the flow. Expand them to see detailed input/output data, duration, and token usage.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="monitor-history"]',
      title: 'Execution History',
      content: 'Browse past executions to compare results, debug issues, or analyze performance trends over time.',
      placement: 'left',
      disableBeacon: true,
    },
  ],

  deploy: [
    {
      target: '[data-tour="deploy-targets"]',
      title: 'Deployment Targets',
      content: 'Choose how to deploy your agent — as a REST API endpoint, embeddable chat widget, npm package, or CLI tool.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="deploy-action"]',
      title: 'Deploy Your Agent',
      content: 'Click Deploy to package your agent for the selected target. You\'ll get endpoint URLs, embed codes, or install commands.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="deploy-export"]',
      title: 'Export Agent',
      content: 'Download your agent\'s complete configuration as a portable JSON file for sharing or backup.',
      placement: 'top',
      disableBeacon: true,
    },
  ],

  resources: [
    {
      target: '[data-tour="resource-add"]',
      title: 'Add Resources',
      content: 'Create reusable prompt templates, tool configurations, scraper presets, and code snippets for your agents.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-tour="resource-search"]',
      title: 'Search & Filter',
      content: 'Quickly find resources by name, content, or type. Filter by category to narrow results.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="resource-grid"]',
      title: 'Resource Library',
      content: 'Your saved resources appear here. Edit, duplicate, or delete them. Save any agent as a reusable template.',
      placement: 'top',
      disableBeacon: true,
    },
  ],

  media: [
    {
      target: '[data-tour="media-stats"]',
      title: 'Media Overview',
      content: 'Track all artifacts generated by your agents — PDFs, DOCX files, HTML pages, videos, and emails.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="media-filter"]',
      title: 'Filter Files',
      content: 'Search by filename or filter by type to quickly find the artifact you need.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="media-grid"]',
      title: 'Artifact Gallery',
      content: 'Click any artifact to open it. Hover to reveal the delete button. Use "Open Folder" to browse files on disk.',
      placement: 'top',
      disableBeacon: true,
    },
  ],

  settings: [
    {
      target: '[data-tour="settings-api-keys"]',
      title: 'API Keys',
      content: 'Add your API keys for Claude, OpenAI, Kimi, and MiniMax. Keys are encrypted and stored securely on your machine.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="settings-models"]',
      title: 'Model Preferences',
      content: 'Set your default LLM provider and model. These defaults are used when creating new agents.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="settings-data"]',
      title: 'Data Management',
      content: 'Export all your agents and settings as a backup, import from a previous export, or reset to start fresh.',
      placement: 'top',
      disableBeacon: true,
    },
  ],
};

/** Get tour steps for a specific view, returning empty array if none found */
export function getTourSteps(viewId) {
  return TOUR_STEPS[viewId] || [];
}
