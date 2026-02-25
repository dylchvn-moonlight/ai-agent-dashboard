// agent-engine.js — Agent Execution Engine (CommonJS, Electron main process)
// Receives an agent definition (nodes + edges DAG), executes each node in
// topological order, passes outputs between nodes, and sends progress events
// back to the renderer via IPC.

const { BrowserWindow } = require('electron');
const LLMRouter = require('./llm-router');
const ArtifactManager = require('./artifact-manager');
const artifactManager = new ArtifactManager();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short unique id */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Send an IPC event to the first available renderer window.
 * @param {string} channel - IPC channel name
 * @param {*} data - Payload
 */
function sendEvent(channel, data) {
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0 && !wins[0].isDestroyed()) {
      wins[0].webContents.send(channel, data);
    }
  } catch {
    // Window may have been closed; swallow silently.
  }
}

/**
 * Kahn's algorithm — returns node IDs in execution order.
 * Throws if the graph contains a cycle.
 */
function topologicalSort(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map();
  const adjacency = new Map(); // source -> [target, ...]

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source).push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    for (const neighbour of adjacency.get(current) || []) {
      const newDeg = inDegree.get(neighbour) - 1;
      inDegree.set(neighbour, newDeg);
      if (newDeg === 0) queue.push(neighbour);
    }
  }

  if (sorted.length !== nodeIds.size) {
    throw new Error(
      'Agent flow contains a cycle — topological sort is not possible.'
    );
  }

  return sorted;
}

/**
 * Resolve the text that should be fed into a node by collecting the outputs
 * of all upstream nodes (those with an edge pointing at this node).
 */
function resolveNodeInput(nodeId, edges, context) {
  const upstreamOutputs = [];

  for (const edge of edges) {
    if (edge.target === nodeId && context.has(edge.source)) {
      upstreamOutputs.push(context.get(edge.source));
    }
  }

  if (upstreamOutputs.length === 0) return '';
  if (upstreamOutputs.length === 1) return stringify(upstreamOutputs[0]);

  // Multiple upstream outputs — combine them
  return upstreamOutputs.map((o) => stringify(o)).join('\n\n');
}

/** Safely stringify a value for display / input piping. */
function stringify(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

/**
 * Strip HTML tags from a string (simple regex approach for scraping).
 */
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Escape a string for use in a regular expression. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely create and invoke a dynamic function from user-provided code.
 * NOTE: This is intentional — the CodeNode and condition evaluator are
 * designed to let users run arbitrary JS within the Electron main process.
 * The calling code is always wrapped in try/catch.
 */
function makeDynamicFunction(paramNames, body) {
  // eslint-disable-next-line no-new-func
  return new Function(...paramNames, body);
}

// ---------------------------------------------------------------------------
// AgentEngine
// ---------------------------------------------------------------------------

class AgentEngine {
  constructor() {
    /** Map<executionId, { abortController: AbortController }> */
    this.executions = new Map();
    this.llmRouter = new LLMRouter();
    /** Simple in-memory buffer store keyed by agent id. */
    this.memoryStore = new Map();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Execute an agent's flow.
   * @param {object} agent       - Full agent object with flow.nodes and flow.edges
   * @param {string} input       - User input string
   * @param {object} credentials - { anthropicKey, openaiKey, localEndpoint }
   * @param {object} settings    - { defaultProvider, defaultModel, temperature, maxTokens, streaming }
   * @returns {Promise<{ success: boolean, output: *, trace: object[], metrics: object }>}
   */
  async execute(agent, input, credentials = {}, settings = {}, executionId) {
    const execId = executionId || uid();
    const abortController = new AbortController();
    this.executions.set(execId, { abortController });

    const nodes = agent.flow?.nodes || [];
    const edges = agent.flow?.edges || [];
    const trace = [];
    const totalStart = Date.now();
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    // Execution context: nodeId -> output value
    const context = new Map();
    // Track which nodes should be skipped (downstream of failed / branched-out nodes)
    const skipSet = new Set();

    try {
      // --- Topological ordering ---
      const sortedIds = topologicalSort(nodes, edges);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // --- Walk each node in order ---
      for (const nodeId of sortedIds) {
        if (abortController.signal.aborted) {
          throw new Error('Execution was stopped by user.');
        }

        if (skipSet.has(nodeId)) continue;

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const nodeType = node.type;
        const nodeData = node.data || {};
        const nodeLabel = nodeData.label || nodeType;
        const nodeInput = resolveNodeInput(nodeId, edges, context) || input;

        const stepStart = Date.now();

        // Notify renderer that this step is starting
        sendEvent('execution:step', {
          executionId: execId,
          nodeId,
          nodeType,
          label: nodeLabel,
          status: 'running',
          input: nodeInput,
        });

        let output = null;
        let tokens = { input: 0, output: 0 };
        let status = 'completed';
        let error = null;

        try {
          const result = await this._executeNode(
            nodeType,
            nodeData,
            nodeInput,
            context,
            edges,
            nodeId,
            input,
            agent,
            credentials,
            settings,
            skipSet,
            abortController.signal,
            execId
          );

          if (result && typeof result === 'object' && result.__engineResult) {
            output = result.output;
            tokens = result.tokens || tokens;
          } else {
            output = result;
          }
        } catch (err) {
          status = 'failed';
          error = err.message || String(err);
          output = null;

          // Mark all downstream nodes for skipping
          this._markDownstream(nodeId, edges, skipSet);
        }

        // Store output in context
        context.set(nodeId, output);

        totalTokensIn += tokens.input;
        totalTokensOut += tokens.output;

        const stepEnd = Date.now();
        const traceEntry = {
          nodeId,
          nodeType,
          label: nodeLabel,
          input: nodeInput,
          output: stringify(output),
          startTime: stepStart,
          endTime: stepEnd,
          duration: stepEnd - stepStart,
          tokens,
          status,
          error,
        };
        trace.push(traceEntry);

        // Notify renderer of step result
        sendEvent('execution:step', {
          executionId: execId,
          nodeId,
          nodeType,
          label: nodeLabel,
          status,
          input: nodeInput,
          output: stringify(output),
          startTime: stepStart,
          endTime: stepEnd,
          duration: stepEnd - stepStart,
          tokens,
          error,
        });
      }

      // --- Determine final output ---
      // Use the OutputNode's value if there is one; otherwise the last node's output.
      let finalOutput = null;
      const outputNodes = nodes.filter((n) => n.type === 'OutputNode');
      if (outputNodes.length > 0) {
        finalOutput = context.get(outputNodes[outputNodes.length - 1].id);
      } else if (sortedIds.length > 0) {
        finalOutput = context.get(sortedIds[sortedIds.length - 1]);
      }

      const totalEnd = Date.now();
      const metrics = {
        totalDuration: totalEnd - totalStart,
        totalTokensIn,
        totalTokensOut,
        nodeCount: sortedIds.length,
        successCount: trace.filter((t) => t.status === 'completed').length,
        failCount: trace.filter((t) => t.status === 'failed').length,
      };

      const result = {
        success: true,
        executionId: execId,
        output: stringify(finalOutput),
        trace,
        metrics,
      };

      sendEvent('execution:complete', result);
      return result;
    } catch (err) {
      const errorResult = {
        success: false,
        executionId: execId,
        output: null,
        trace,
        error: err.message || String(err),
        metrics: {
          totalDuration: Date.now() - totalStart,
          totalTokensIn,
          totalTokensOut,
          nodeCount: nodes.length,
          successCount: trace.filter((t) => t.status === 'completed').length,
          failCount: trace.filter((t) => t.status === 'failed').length,
        },
      };

      sendEvent('execution:error', errorResult);
      return errorResult;
    } finally {
      this.executions.delete(execId);
    }
  }

  /**
   * Stop a running execution.
   * @param {string} executionId
   */
  stop(executionId) {
    // If a specific id is given, stop that one
    if (executionId && this.executions.has(executionId)) {
      this.executions.get(executionId).abortController.abort();
      return true;
    }
    // Otherwise stop all
    for (const exec of this.executions.values()) {
      exec.abortController.abort();
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Node execution dispatcher
  // -------------------------------------------------------------------------

  /**
   * Execute a single node and return its output.
   * For LLM nodes the return is wrapped: { __engineResult: true, output, tokens }
   */
  async _executeNode(
    nodeType,
    nodeData,
    nodeInput,
    context,
    edges,
    nodeId,
    userInput,
    agent,
    credentials,
    settings,
    skipSet,
    signal,
    executionId
  ) {
    switch (nodeType) {
      case 'InputNode':
        return this._execInput(nodeData, userInput);

      case 'OutputNode':
        return this._execOutput(nodeData, nodeInput);

      case 'LLMNode':
        return this._execLLM(nodeData, nodeInput, credentials, settings);

      case 'MemoryNode':
        return this._execMemory(nodeData, nodeInput, agent.id);

      case 'ToolNode':
        return this._execTool(nodeData, nodeInput);

      case 'ScraperNode':
        return this._execScraper(nodeData, nodeInput, signal);

      case 'HTTPNode':
        return this._execHTTP(nodeData, nodeInput, signal);

      case 'CodeNode':
        return this._execCode(nodeData, nodeInput, context);

      case 'ConditionNode':
        return this._execCondition(nodeData, nodeInput, edges, nodeId, skipSet);

      case 'LoopNode':
        return this._execLoop(nodeData, nodeInput);

      case 'RouterNode':
        return this._execRouter(nodeData, nodeInput, edges, nodeId, skipSet);

      case 'TransformNode':
        return this._execTransform(nodeData, nodeInput);

      case 'SubAgentNode':
        return this._execSubAgent(nodeData, nodeInput, credentials, settings);

      case 'EmailNode':
        return this._execEmail(nodeData, nodeInput, credentials, context, edges, nodeId);

      case 'PDFNode':
        return this._execPDF(nodeData, nodeInput, agent.id, executionId);

      case 'DocxNode':
        return this._execDocx(nodeData, nodeInput, agent.id, executionId);

      case 'BlogNode':
        return this._execBlog(nodeData, nodeInput, agent.id, executionId);

      case 'VideoNode':
        return this._execVideo(nodeData, nodeInput, agent.id, executionId);

      /* ─── v0.4.2 — Flow Control ─── */
      case 'SwitchNode':
        return this._execSwitch(nodeData, nodeInput, edges, nodeId, skipSet);
      case 'FilterNode':
        return this._execFilter(nodeData, nodeInput);
      case 'SplitNode':
        return this._execSplit(nodeData, nodeInput);
      case 'MergeNode':
        return this._execMerge(nodeData, nodeInput);
      case 'WaitNode':
        return this._execWait(nodeData, nodeInput, signal);

      /* ─── v0.4.2 — AI Processing ─── */
      case 'TextClassifierNode':
        return this._execTextClassifier(nodeData, nodeInput, credentials, settings);
      case 'SentimentNode':
        return this._execSentiment(nodeData, nodeInput, credentials, settings);
      case 'InfoExtractorNode':
        return this._execInfoExtractor(nodeData, nodeInput, credentials, settings);
      case 'SummarizerNode':
        return this._execSummarizer(nodeData, nodeInput, credentials, settings);
      case 'QAChainNode':
        return this._execQAChain(nodeData, nodeInput, credentials, settings);

      /* ─── v0.4.2 — Triggers ─── */
      case 'ScheduleTriggerNode':
        return this._execScheduleTrigger(nodeData, userInput);
      case 'WebhookTriggerNode':
        return this._execWebhookTrigger(nodeData, userInput);
      case 'ChatTriggerNode':
        return this._execChatTrigger(nodeData, userInput);

      /* ─── v0.4.2 — Data & Tools ─── */
      case 'SortNode':
        return this._execSort(nodeData, nodeInput);
      case 'AggregateNode':
        return this._execAggregate(nodeData, nodeInput);
      case 'DeduplicateNode':
        return this._execDeduplicate(nodeData, nodeInput);
      case 'CalculatorNode':
        return this._execCalculator(nodeData, nodeInput);
      case 'SearchNode':
        return this._execSearch(nodeData, nodeInput, signal);
      case 'WikipediaNode':
        return this._execWikipedia(nodeData, nodeInput, signal);

      /* ─── v0.7.0 — Integrations ─── */
      case 'GmailNode':
        return this._execGmail(nodeData, nodeInput, credentials, signal);
      case 'GoogleSheetsNode':
        return this._execGoogleSheets(nodeData, nodeInput, credentials, signal);
      case 'YouTubeNode':
        return this._execYouTube(nodeData, nodeInput, credentials, signal);
      case 'SlackNode':
        return this._execSlack(nodeData, nodeInput, credentials, signal);
      case 'TelegramNode':
        return this._execTelegram(nodeData, nodeInput, credentials, signal);
      case 'AirtableNode':
        return this._execAirtable(nodeData, nodeInput, credentials, signal);

      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }

  // -------------------------------------------------------------------------
  // Individual node executors
  // -------------------------------------------------------------------------

  /** 1. InputNode — pass through the user's original input */
  _execInput(nodeData, userInput) {
    return nodeData.defaultValue || userInput;
  }

  /** 2. OutputNode — pass through whatever flows in (terminal node) */
  _execOutput(nodeData, nodeInput) {
    if (nodeData.outputFormat === 'json') {
      try {
        return JSON.parse(nodeInput);
      } catch {
        return nodeInput;
      }
    }
    return nodeInput;
  }

  /** 3. LLMNode — call an LLM via the router */
  async _execLLM(nodeData, nodeInput, credentials, settings) {
    const provider = nodeData.provider || settings.defaultProvider || 'claude';
    const config = {
      model: nodeData.model || settings.defaultModel || 'claude-sonnet-4-6',
      systemPrompt: nodeData.systemPrompt || '',
      temperature:
        nodeData.temperature !== undefined
          ? nodeData.temperature
          : settings.temperature ?? 0.7,
      maxTokens: nodeData.maxTokens || settings.maxTokens || 4096,
    };

    const result = await this.llmRouter.call(
      provider,
      config,
      nodeInput,
      credentials
    );

    return {
      __engineResult: true,
      output: result.text,
      tokens: result.tokens,
    };
  }

  /** 4. MemoryNode — store/retrieve conversation history */
  _execMemory(nodeData, nodeInput, agentId) {
    const memoryKey = `${agentId}:${nodeData.memoryType || 'buffer'}`;
    const maxMessages = nodeData.maxMessages || 20;

    if (!this.memoryStore.has(memoryKey)) {
      this.memoryStore.set(memoryKey, []);
    }

    const history = this.memoryStore.get(memoryKey);

    // Add the new input to history
    if (nodeInput) {
      history.push({
        role: 'user',
        content: nodeInput,
        timestamp: Date.now(),
      });
    }

    // Trim to maxMessages
    while (history.length > maxMessages) {
      history.shift();
    }

    this.memoryStore.set(memoryKey, history);

    // Return the conversation history as context string
    return history
      .map((m) => `[${m.role}]: ${m.content}`)
      .join('\n');
  }

  /** 5. ToolNode — generic tool execution stub */
  async _execTool(nodeData, nodeInput) {
    const toolType = nodeData.toolType || 'passthrough';
    const config = nodeData.config || {};

    switch (toolType) {
      case 'json_parse':
        try {
          return JSON.parse(nodeInput);
        } catch {
          return { error: 'Invalid JSON', raw: nodeInput };
        }

      case 'json_stringify':
        return JSON.stringify(
          typeof nodeInput === 'string' ? nodeInput : nodeInput,
          null,
          2
        );

      case 'regex': {
        const pattern = new RegExp(config.pattern || '.*', config.flags || 'g');
        const matches = nodeInput.match(pattern);
        return matches ? matches.join('\n') : '';
      }

      case 'template': {
        const template = config.template || '{{input}}';
        return template.replace(/\{\{input\}\}/g, nodeInput);
      }

      case 'api':
      case 'passthrough':
      default:
        return nodeInput;
    }
  }

  /** 6. ScraperNode — fetch a URL and strip HTML */
  async _execScraper(nodeData, nodeInput, signal) {
    const url = nodeData.url || nodeInput;
    if (!url) throw new Error('ScraperNode: no URL provided.');

    const response = await fetch(url, {
      signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AIAgentDashboard/1.0; +https://example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`ScraperNode: HTTP ${response.status} for ${url}`);
    }

    let html = await response.text();

    // If a CSS selector-like filter is provided, try a basic extraction
    if (nodeData.selector) {
      const selectorRegex = new RegExp(
        `<[^>]*(?:id|class)\\s*=\\s*["'][^"']*${escapeRegex(nodeData.selector)}[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>`,
        'gi'
      );
      const matches = html.match(selectorRegex);
      if (matches && matches.length > 0) {
        html = matches.join('\n');
      }
    }

    const text = stripHtml(html);

    if (nodeData.format === 'json') {
      return JSON.stringify({ url, text });
    }
    return text;
  }

  /** 7. HTTPNode — make an HTTP request */
  async _execHTTP(nodeData, nodeInput, signal) {
    const method = (nodeData.method || 'GET').toUpperCase();
    let url = nodeData.url || '';

    if (!url) throw new Error('HTTPNode: no URL provided.');

    // Allow dynamic URL interpolation
    url = url.replace(/\{\{input\}\}/g, encodeURIComponent(nodeInput));

    const headers = { ...nodeData.headers };

    const fetchOptions = { method, headers, signal };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      let body = nodeData.body;
      if (typeof body === 'string') {
        body = body.replace(/\{\{input\}\}/g, nodeInput);
      } else if (body && typeof body === 'object') {
        body = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (nodeInput) {
        body = nodeInput;
      }
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get('content-type') || '';
    let result;
    if (contentType.includes('application/json')) {
      result = await response.json();
      result = JSON.stringify(result, null, 2);
    } else {
      result = await response.text();
    }

    if (!response.ok) {
      throw new Error(
        `HTTPNode: ${method} ${url} returned ${response.status}: ${result.slice(0, 500)}`
      );
    }

    return result;
  }

  /** 8. CodeNode — execute JavaScript via dynamic function construction */
  _execCode(nodeData, nodeInput, context) {
    const language = nodeData.language || 'javascript';

    if (language !== 'javascript') {
      throw new Error(
        `CodeNode: only JavaScript is supported (got "${language}").`
      );
    }

    const code = nodeData.code || 'return input;';

    // Build a context object the code can access
    const ctxObj = {};
    for (const [key, value] of context.entries()) {
      ctxObj[key] = value;
    }

    try {
      const fn = makeDynamicFunction(['input', 'context'], code);
      const result = fn(nodeInput, ctxObj);
      return result;
    } catch (err) {
      throw new Error(`CodeNode execution error: ${err.message}`);
    }
  }

  /** 9. ConditionNode — evaluate a condition and branch */
  _execCondition(nodeData, nodeInput, edges, nodeId, skipSet) {
    const conditions = nodeData.conditions || [];
    let conditionResult = false;

    if (conditions.length === 0) {
      // If no conditions are defined, treat truthy input as true
      conditionResult = !!nodeInput && nodeInput !== 'false' && nodeInput !== '0';
    } else {
      // Evaluate conditions — each condition is { field, operator, value }
      conditionResult = conditions.every((cond) => {
        return this._evaluateCondition(cond, nodeInput);
      });
    }

    // Determine which handle to follow
    const activeHandle = conditionResult ? 'true' : 'false';
    const inactiveHandle = conditionResult ? 'false' : 'true';

    // Edges from this condition node with the INACTIVE handle
    // should have their targets skipped.
    for (const edge of edges) {
      if (edge.source === nodeId && edge.sourceHandle === inactiveHandle) {
        this._markDownstream(edge.target, edges, skipSet, true);
      }
    }

    return {
      result: conditionResult,
      branch: activeHandle,
      input: nodeInput,
    };
  }

  /** 10. LoopNode — iterate up to maxIterations or until stopCondition is met */
  _execLoop(nodeData, nodeInput) {
    const maxIterations = nodeData.maxIterations || 10;
    const stopCondition = nodeData.stopCondition || '';
    const results = [];

    let current = nodeInput;
    for (let i = 0; i < maxIterations; i++) {
      results.push(current);

      // Check stop condition
      if (stopCondition) {
        try {
          const fn = makeDynamicFunction(['input', 'iteration'], stopCondition);
          if (fn(current, i)) break;
        } catch {
          // If stopCondition is a simple string, check for inclusion
          if (typeof current === 'string' && current.includes(stopCondition)) {
            break;
          }
        }
      }
    }

    return results.length === 1
      ? stringify(results[0])
      : JSON.stringify(results, null, 2);
  }

  /** 11. RouterNode — route to different paths based on conditions */
  _execRouter(nodeData, nodeInput, edges, nodeId, skipSet) {
    const routes = nodeData.routes || [];
    let matchedRouteIndex = -1;

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      if (!route.condition) continue;

      try {
        const fn = makeDynamicFunction(['input'], `return (${route.condition})`);
        if (fn(nodeInput)) {
          matchedRouteIndex = i;
          break;
        }
      } catch {
        // Try simple string matching as fallback
        if (
          typeof nodeInput === 'string' &&
          nodeInput.toLowerCase().includes(route.condition.toLowerCase())
        ) {
          matchedRouteIndex = i;
          break;
        }
      }
    }

    // Skip edges whose sourceHandle doesn't match the chosen route
    const outEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outEdges) {
      const handleIndex = parseInt(edge.sourceHandle, 10);
      if (
        !isNaN(handleIndex) &&
        handleIndex !== matchedRouteIndex &&
        matchedRouteIndex !== -1
      ) {
        this._markDownstream(edge.target, edges, skipSet, true);
      }
    }

    const matchedLabel =
      matchedRouteIndex >= 0
        ? routes[matchedRouteIndex].label || `Route ${matchedRouteIndex}`
        : 'no match';

    return {
      matchedRoute: matchedLabel,
      matchedIndex: matchedRouteIndex,
      input: nodeInput,
    };
  }

  /** 12. TransformNode — transform data */
  _execTransform(nodeData, nodeInput) {
    const transformType = nodeData.transformType || 'template';
    const expression = nodeData.expression || '';

    switch (transformType) {
      case 'template':
        return expression
          ? expression.replace(/\{\{input\}\}/g, nodeInput)
          : nodeInput;

      case 'jsonpath': {
        try {
          const obj =
            typeof nodeInput === 'string'
              ? JSON.parse(nodeInput)
              : nodeInput;
          const parts = expression.split('.');
          let current = obj;
          for (const part of parts) {
            if (current == null) break;
            current = current[part];
          }
          return stringify(current);
        } catch {
          return nodeInput;
        }
      }

      case 'regex': {
        try {
          const match = nodeInput.match(new RegExp(expression));
          return match ? match[0] : '';
        } catch {
          return nodeInput;
        }
      }

      case 'uppercase':
        return typeof nodeInput === 'string'
          ? nodeInput.toUpperCase()
          : nodeInput;

      case 'lowercase':
        return typeof nodeInput === 'string'
          ? nodeInput.toLowerCase()
          : nodeInput;

      case 'trim':
        return typeof nodeInput === 'string'
          ? nodeInput.trim()
          : nodeInput;

      case 'split': {
        const delimiter = expression || ',';
        return typeof nodeInput === 'string'
          ? JSON.stringify(nodeInput.split(delimiter))
          : nodeInput;
      }

      case 'join': {
        try {
          const arr = JSON.parse(nodeInput);
          if (Array.isArray(arr)) {
            return arr.join(expression || ', ');
          }
        } catch {
          // not an array
        }
        return nodeInput;
      }

      case 'code': {
        try {
          const fn = makeDynamicFunction(['input'], expression);
          return stringify(fn(nodeInput));
        } catch (err) {
          throw new Error(`TransformNode code error: ${err.message}`);
        }
      }

      default:
        return nodeInput;
    }
  }

  /** 13. SubAgentNode — call another agent recursively */
  async _execSubAgent(nodeData, nodeInput, credentials, settings) {
    const agentId = nodeData.agentId;
    if (!agentId) {
      throw new Error('SubAgentNode: no agentId specified.');
    }

    // Load agents from disk to find the sub-agent
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const dataDir = path.join(app.getPath('userData'), 'AIAgentDashboard');
    const dataFile = path.join(dataDir, 'data.json');

    let subAgent = null;
    try {
      if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        if (data?.agents && Array.isArray(data.agents)) {
          subAgent = data.agents.find((a) => a.id === agentId);
        }
      }
    } catch {
      // ignore read errors
    }

    if (!subAgent) {
      throw new Error(`SubAgentNode: agent "${agentId}" not found.`);
    }

    // Map input if mapping is defined
    let mappedInput = nodeInput;
    if (nodeData.inputMapping && Object.keys(nodeData.inputMapping).length > 0) {
      try {
        const inputObj =
          typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
        const mapped = {};
        for (const [targetKey, sourceKey] of Object.entries(
          nodeData.inputMapping
        )) {
          mapped[targetKey] = inputObj[sourceKey] ?? nodeInput;
        }
        mappedInput = JSON.stringify(mapped);
      } catch {
        // mapping failed; use raw input
      }
    }

    // Recursively execute the sub-agent
    const result = await this.execute(subAgent, mappedInput, credentials, settings);
    return result.output || '';
  }

  /** 14. EmailNode — send email via SMTP */
  async _execEmail(nodeData, nodeInput, credentials, context, edges, nodeId) {
    const nodemailer = require('nodemailer');

    const host = credentials['smtp-host'];
    const port = parseInt(credentials['smtp-port']) || 587;
    const secure = credentials['smtp-secure'] === 'true';
    const user = credentials['smtp-user'];
    const pass = credentials['smtp-pass'];
    const fromName = credentials['smtp-from-name'] || 'AI Agent';
    const fromEmail = credentials['smtp-from-email'] || user;

    if (!host || !user) {
      throw new Error('SMTP not configured. Go to Settings > Email to set up.');
    }

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
    });

    // Resolve template
    const body = (nodeData.bodyTemplate || '{{input}}').replace(/\{\{input\}\}/g, nodeInput);
    const subject = (nodeData.subject || 'Agent Output').replace(/\{\{input\}\}/g, nodeInput.slice(0, 100));
    const to = nodeData.to;

    if (!to) throw new Error('EmailNode: no "to" address configured.');

    // Collect upstream artifacts as attachments
    const attachments = [];
    if (nodeData.attachFromUpstream) {
      for (const edge of edges) {
        if (edge.target === nodeId && context.has(edge.source)) {
          const upstream = context.get(edge.source);
          if (upstream && typeof upstream === 'object' && upstream.__artifact) {
            attachments.push({
              filename: upstream.filename,
              path: upstream.filePath,
            });
          }
        }
      }
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      cc: nodeData.cc || undefined,
      bcc: nodeData.bcc || undefined,
      subject,
      html: body,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return { sent: true, messageId: info.messageId, to, subject };
  }

  /** 15. PDFNode — generate PDF from content */
  async _execPDF(nodeData, nodeInput, agentId, executionId) {
    const PDFDocument = require('pdfkit');

    const filename = (nodeData.filenameTemplate || 'output-{{date}}') + '.pdf';
    const pageSize = nodeData.pageSize || 'A4';

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: pageSize, margin: 40 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const result = artifactManager.save({
            agentId, executionId,
            nodeId: 'pdf', nodeType: 'PDFNode',
            filename, buffer,
            mimeType: 'application/pdf',
          });

          if (result.success) {
            resolve({
              __artifact: true,
              artifactId: result.artifact.id,
              filePath: result.artifact.absolutePath,
              filename: result.artifact.filename,
              type: 'pdf',
              mimeType: 'application/pdf',
            });
          } else {
            reject(new Error('Failed to save PDF artifact'));
          }
        });
        doc.on('error', reject);

        // Add header if configured
        if (nodeData.includeHeader && nodeData.headerText) {
          doc.fontSize(9).fillColor('#888888').text(nodeData.headerText, { align: 'center' });
          doc.moveDown(0.5);
          doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#cccccc');
          doc.moveDown(0.5);
        }

        // Write content — parse basic markdown-like formatting
        const lines = nodeInput.split('\n');
        for (const line of lines) {
          if (line.startsWith('# ')) {
            doc.fontSize(22).fillColor('#000000').text(line.slice(2), { continued: false });
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.fontSize(18).fillColor('#222222').text(line.slice(3), { continued: false });
            doc.moveDown(0.2);
          } else if (line.startsWith('### ')) {
            doc.fontSize(14).fillColor('#333333').text(line.slice(4), { continued: false });
            doc.moveDown(0.2);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.fontSize(11).fillColor('#000000').text(`  \u2022  ${line.slice(2)}`, { continued: false });
          } else if (line.trim() === '') {
            doc.moveDown(0.5);
          } else {
            doc.fontSize(11).fillColor('#000000').text(line, { continued: false });
          }
        }

        // Add footer if configured
        if (nodeData.includeFooter && nodeData.footerText) {
          doc.fontSize(9).fillColor('#888888').text(nodeData.footerText, 40, doc.page.height - 50, { align: 'center' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /** 16. DocxNode — generate Word document */
  async _execDocx(nodeData, nodeInput, agentId, executionId) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

    const filename = (nodeData.filenameTemplate || 'document-{{date}}') + '.docx';
    const fontSize = (nodeData.fontSize || 12) * 2; // docx uses half-points
    const fontFamily = nodeData.fontFamily || 'Arial';

    // Parse input into paragraphs
    const children = [];
    const lines = nodeInput.split('\n');

    if (nodeData.documentTitle) {
      children.push(new Paragraph({
        children: [new TextRun({ text: nodeData.documentTitle, bold: true, size: 32, font: fontFamily })],
        heading: HeadingLevel.TITLE,
      }));
    }

    for (const line of lines) {
      if (line.startsWith('# ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), bold: true, size: 28, font: fontFamily })],
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(3), bold: true, size: 24, font: fontFamily })],
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(4), bold: true, size: 22, font: fontFamily })],
          heading: HeadingLevel.HEADING_3,
        }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), size: fontSize, font: fontFamily })],
          bullet: { level: 0 },
        }));
      } else if (line.trim() === '') {
        children.push(new Paragraph({ children: [] }));
      } else {
        // Handle **bold** and *italic*
        const runs = [];
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: fontSize, font: fontFamily }));
          } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size: fontSize, font: fontFamily }));
          } else {
            runs.push(new TextRun({ text: part, size: fontSize, font: fontFamily }));
          }
        }
        children.push(new Paragraph({ children: runs }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    const result = artifactManager.save({
      agentId, executionId,
      nodeId: 'docx', nodeType: 'DocxNode',
      filename, buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    if (!result.success) throw new Error('Failed to save DOCX artifact');

    return {
      __artifact: true,
      artifactId: result.artifact.id,
      filePath: result.artifact.absolutePath,
      filename: result.artifact.filename,
      type: 'docx',
      mimeType: result.artifact.mimeType,
    };
  }

  /** 17. BlogNode — render markdown to styled HTML */
  _execBlog(nodeData, nodeInput, agentId, executionId) {
    const marked = require('marked');

    const filename = (nodeData.filenameTemplate || 'blog-{{date}}') + '.html';
    const title = nodeData.pageTitle || 'Blog Post';
    const theme = nodeData.cssTheme || 'modern';
    const meta = nodeData.metaDescription || '';

    const htmlContent = marked(nodeInput);

    // CSS themes
    const themes = {
      minimal: 'body{font-family:system-ui,sans-serif;max-width:700px;margin:2rem auto;padding:0 1rem;color:#333;line-height:1.7}h1,h2,h3{color:#111}a{color:#2563EB}pre{background:#f5f5f5;padding:1rem;border-radius:6px;overflow-x:auto}code{font-size:0.9em}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1rem;color:#666}',
      modern: 'body{font-family:"Inter",system-ui,sans-serif;max-width:750px;margin:3rem auto;padding:0 1.5rem;color:#e2e8f0;background:#0f172a;line-height:1.8}h1{font-size:2.2rem;background:linear-gradient(135deg,#3b82f6,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}h2{color:#93c5fd;border-bottom:1px solid #1e293b;padding-bottom:0.5rem}h3{color:#c4b5fd}a{color:#60a5fa}pre{background:#1e293b;padding:1rem;border-radius:8px;border:1px solid #334155;overflow-x:auto}code{color:#f472b6;font-size:0.9em}blockquote{border-left:3px solid #3b82f6;margin-left:0;padding-left:1rem;color:#94a3b8}img{max-width:100%;border-radius:8px}',
      newspaper: 'body{font-family:Georgia,"Times New Roman",serif;max-width:680px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.8}h1{font-size:2.5rem;text-align:center;border-bottom:2px solid #000;padding-bottom:0.5rem;margin-bottom:1.5rem}h2{font-size:1.5rem;border-bottom:1px solid #ccc;padding-bottom:0.3rem}p:first-of-type::first-letter{font-size:3rem;float:left;line-height:1;margin-right:0.1em;font-weight:bold}a{color:#1a1a1a;text-decoration:underline}blockquote{font-style:italic;border-left:3px solid #000;margin-left:0;padding-left:1rem}',
    };

    const css = themes[theme] || themes.modern;

    // TOC generation if enabled
    let toc = '';
    if (nodeData.includeTableOfContents) {
      const headings = nodeInput.match(/^#{1,3}\s+.+$/gm) || [];
      if (headings.length > 0) {
        toc = '<nav class="toc"><h2>Table of Contents</h2><ul>' +
          headings.map(h => {
            const level = h.match(/^#+/)[0].length;
            const text = h.replace(/^#+\s+/, '');
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return `<li style="margin-left:${(level - 1) * 1.2}rem"><a href="#${id}">${text}</a></li>`;
          }).join('') + '</ul></nav>';
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${meta.replace(/"/g, '&quot;')}">
  <title>${title.replace(/</g, '&lt;')}</title>
  <style>${css}</style>
</head>
<body>
${toc}
${htmlContent}
</body>
</html>`;

    const result = artifactManager.save({
      agentId, executionId,
      nodeId: 'blog', nodeType: 'BlogNode',
      filename, buffer: fullHtml,
      mimeType: 'text/html',
    });

    if (!result.success) throw new Error('Failed to save blog artifact');

    return {
      __artifact: true,
      artifactId: result.artifact.id,
      filePath: result.artifact.absolutePath,
      filename: result.artifact.filename,
      type: 'html',
      mimeType: 'text/html',
    };
  }

  /** 18. VideoNode — compose video via FFmpeg */
  async _execVideo(nodeData, nodeInput, agentId, executionId) {
    const ffmpeg = require('fluent-ffmpeg');
    let ffmpegPath;
    try {
      ffmpegPath = require('ffmpeg-static');
    } catch {
      throw new Error('ffmpeg-static not installed. Video generation requires FFmpeg.');
    }
    ffmpeg.setFfmpegPath(ffmpegPath);

    const filename = (nodeData.filenameTemplate || 'video-{{date}}') + '.mp4';
    const fps = nodeData.fps || 30;
    const resolution = nodeData.resolution || '1920x1080';
    const [width, height] = resolution.split('x').map(Number);
    const codec = nodeData.codec || 'libx264';

    // Resolve output path
    const resolvedFilename = filename
      .replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10))
      .replace(/\{\{time\}\}/g, new Date().toISOString().slice(11, 19).replace(/:/g, '-'))
      .replace(/\{\{timestamp\}\}/g, Date.now().toString());
    const path = require('path');
    const fs = require('fs');
    const dir = path.join(artifactManager.getArtifactsDir(), agentId, executionId);
    fs.mkdirSync(dir, { recursive: true });
    const outputPath = path.join(dir, resolvedFilename);

    // Parse input for image/audio paths
    let imagePath = nodeData.imagePath || '';
    let audioPath = nodeData.audioSource || '';

    // If upstream provided paths as JSON
    if (nodeInput) {
      try {
        const parsed = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
        if (parsed.image) imagePath = parsed.image;
        if (parsed.audio) audioPath = parsed.audio;
        if (parsed.images) imagePath = parsed.images;
      } catch {
        // nodeInput is not JSON — might be a file path
        if (nodeInput.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
          imagePath = nodeInput;
        }
      }
    }

    if (!imagePath && !audioPath) {
      throw new Error('VideoNode: no image or audio source provided.');
    }

    return new Promise((resolve, reject) => {
      let cmd = ffmpeg();

      if (imagePath) {
        cmd = cmd.input(imagePath);
        if (nodeData.inputType === 'single_image_with_audio') {
          cmd = cmd.loop();
        } else {
          cmd = cmd.inputFPS(fps);
        }
      }

      if (audioPath) {
        cmd = cmd.input(audioPath).audioCodec('aac');
      }

      cmd
        .videoCodec(codec)
        .size(`${width}x${height}`)
        .outputOptions(['-pix_fmt', 'yuv420p'])
        .fps(fps);

      if (audioPath && nodeData.inputType === 'single_image_with_audio') {
        cmd = cmd.outputOptions(['-shortest']);
      }

      cmd
        .output(outputPath)
        .on('end', () => {
          const stats = fs.statSync(outputPath);
          const { app } = require('electron');
          const DATA_DIR = path.join(app.getPath('userData'), 'AIAgentDashboard');
          const relativePath = path.relative(DATA_DIR, outputPath).replace(/\\/g, '/');

          // Register artifact manually (since we already wrote the file)
          const dataFile = path.join(DATA_DIR, 'data.json');
          let data = {};
          try {
            data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
          } catch { /* ignore */ }
          if (!Array.isArray(data.artifacts)) data.artifacts = [];
          const crypto = require('crypto');
          const artifact = {
            id: `art_${crypto.randomUUID().slice(0, 12)}`,
            agentId, executionId,
            nodeId: 'video', nodeType: 'VideoNode',
            type: 'video',
            filename: resolvedFilename,
            relativePath,
            absolutePath: outputPath.replace(/\\/g, '/'),
            sizeBytes: stats.size,
            mimeType: 'video/mp4',
            createdAt: new Date().toISOString(),
            metadata: { fps, resolution, codec },
          };
          data.artifacts.push(artifact);
          fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

          resolve({
            __artifact: true,
            artifactId: artifact.id,
            filePath: artifact.absolutePath,
            filename: artifact.filename,
            type: 'video',
            mimeType: 'video/mp4',
          });
        })
        .on('error', (err) => {
          reject(new Error(`VideoNode FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Evaluate a single condition object: { field, operator, value } */
  _evaluateCondition(cond, nodeInput) {
    let inputValue;

    // Try to extract field from JSON input
    if (cond.field) {
      try {
        const obj =
          typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
        inputValue = obj[cond.field];
      } catch {
        inputValue = nodeInput;
      }
    } else {
      inputValue = nodeInput;
    }

    const compareValue = cond.value;
    const operator = cond.operator || 'equals';

    switch (operator) {
      case 'equals':
      case '==':
        return String(inputValue) === String(compareValue);
      case 'not_equals':
      case '!=':
        return String(inputValue) !== String(compareValue);
      case 'contains':
        return String(inputValue).includes(String(compareValue));
      case 'not_contains':
        return !String(inputValue).includes(String(compareValue));
      case 'greater_than':
      case '>':
        return Number(inputValue) > Number(compareValue);
      case 'less_than':
      case '<':
        return Number(inputValue) < Number(compareValue);
      case 'greater_equal':
      case '>=':
        return Number(inputValue) >= Number(compareValue);
      case 'less_equal':
      case '<=':
        return Number(inputValue) <= Number(compareValue);
      case 'regex':
        try {
          return new RegExp(compareValue).test(String(inputValue));
        } catch {
          return false;
        }
      case 'truthy':
        return !!inputValue;
      case 'falsy':
        return !inputValue;
      case 'exists':
        return inputValue !== undefined && inputValue !== null;
      default:
        return !!inputValue;
    }
  }

  /**
   * Recursively mark a node and all its descendants for skipping.
   * @param {string} nodeId - Starting node
   * @param {object[]} edges - All edges
   * @param {Set} skipSet - The set to add skipped node ids to
   * @param {boolean} includeSelf - Whether to include nodeId itself
   */
  _markDownstream(nodeId, edges, skipSet, includeSelf = false) {
    if (includeSelf) skipSet.add(nodeId);
    for (const edge of edges) {
      if (edge.source === nodeId && !skipSet.has(edge.target)) {
        skipSet.add(edge.target);
        this._markDownstream(edge.target, edges, skipSet, false);
      }
    }
  }

  // =========================================================================
  // v0.4.2 — Flow Control Executors
  // =========================================================================

  _execSwitch(nodeData, nodeInput, edges, nodeId, skipSet) {
    const field = nodeData.switchField || 'value';
    let testVal;
    try {
      const parsed = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
      testVal = parsed?.[field] ?? String(nodeInput);
    } catch {
      testVal = String(nodeInput);
    }

    const cases = nodeData.cases || [];
    let matchedIdx = -1;
    let defaultIdx = -1;
    for (let i = 0; i < cases.length; i++) {
      if (cases[i].value === '*') { defaultIdx = i; continue; }
      if (String(cases[i].value) === String(testVal)) { matchedIdx = i; break; }
    }
    if (matchedIdx === -1) matchedIdx = defaultIdx;

    // Skip downstream of non-matching handles
    const outEdges = edges.filter((e) => e.source === nodeId);
    for (let i = 0; i < cases.length; i++) {
      if (i === matchedIdx) continue;
      const handleId = `case-${i}`;
      outEdges
        .filter((e) => e.sourceHandle === handleId)
        .forEach((e) => this._markDownstream(e.target, edges, skipSet, true));
    }

    return nodeInput;
  }

  _execFilter(nodeData, nodeInput) {
    const expr = nodeData.filterExpression || '';
    if (!expr) return nodeInput;

    let items;
    try {
      items = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
    } catch {
      return nodeInput;
    }

    if (!Array.isArray(items)) return nodeInput;

    // Safe evaluation using Function constructor with item parameter only
    const filterFn = new Function('item', `return (${expr})`);
    const filtered = items.filter((item) => {
      try { return filterFn(item); } catch { return false; }
    });
    return nodeData.filterMode === 'exclude'
      ? items.filter((item) => !filtered.includes(item))
      : filtered;
  }

  _execSplit(nodeData, nodeInput) {
    const splitBy = nodeData.splitBy || 'items';
    const splitCount = nodeData.splitCount || 2;

    if (splitBy === 'lines') {
      const lines = String(nodeInput).split('\n');
      // Chunk lines into splitCount groups
      const chunkSize = Math.ceil(lines.length / splitCount);
      const chunks = [];
      for (let i = 0; i < lines.length; i += chunkSize) {
        chunks.push(lines.slice(i, i + chunkSize).join('\n'));
      }
      return chunks;
    }

    if (splitBy === 'chunks') {
      const text = String(nodeInput);
      const chunkSize = Math.ceil(text.length / splitCount);
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks;
    }

    // Default: 'items' — split an array
    let items;
    try {
      items = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
    } catch {
      items = String(nodeInput).split('\n');
    }
    if (!Array.isArray(items)) items = [items];

    // Chunk array into splitCount groups
    const chunkSize = Math.ceil(items.length / splitCount);
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks.length === 1 ? chunks[0] : chunks;
  }

  _execMerge(nodeData, nodeInput) {
    const mode = nodeData.mergeMode || 'append';

    // Try to parse input as array(s) for zip/merge operations
    let items;
    if (Array.isArray(nodeInput)) {
      items = nodeInput;
    } else if (typeof nodeInput === 'string') {
      try {
        const parsed = JSON.parse(nodeInput);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Split by double-newline (how resolveNodeInput joins multiple upstream outputs)
        items = nodeInput.split('\n\n').filter(Boolean);
      }
    } else {
      items = [nodeInput];
    }

    switch (mode) {
      case 'zip': {
        // Pair elements from upstream arrays: [[a1,b1], [a2,b2], ...]
        const arrays = items.map((item) => {
          if (Array.isArray(item)) return item;
          try {
            const parsed = JSON.parse(item);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return [item];
          }
        });
        const maxLen = Math.max(...arrays.map((a) => a.length));
        const zipped = [];
        for (let i = 0; i < maxLen; i++) {
          zipped.push(arrays.map((a) => a[i] ?? null));
        }
        return JSON.stringify(zipped, null, 2);
      }
      case 'merge':
        if (items.every((i) => typeof i === 'object' && i !== null && !Array.isArray(i))) {
          return JSON.stringify(Object.assign({}, ...items), null, 2);
        }
        return items.map((i) => typeof i === 'string' ? i : JSON.stringify(i)).join('\n');
      case 'first':
        return items.find((i) => i != null && i !== '') ?? '';
      case 'append':
      default:
        return items.map((i) => typeof i === 'string' ? i : JSON.stringify(i)).join('\n');
    }
  }

  async _execWait(nodeData, nodeInput, signal) {
    const duration = nodeData.waitDuration || 1;
    const unit = nodeData.waitUnit || 'seconds';
    let ms = duration;
    if (unit === 'seconds') ms = duration * 1000;
    else if (unit === 'minutes') ms = duration * 60000;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Wait aborted'));
        }, { once: true });
      }
    });

    return nodeInput;
  }

  // =========================================================================
  // v0.4.2 — AI Processing Executors (all use llmRouter internally)
  // =========================================================================

  async _execAIProcessing(systemPrompt, nodeInput, credentials, settings) {
    const provider = settings.defaultProvider || 'claude';
    const config = {
      model: settings.defaultModel || 'claude-sonnet-4-6',
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    };
    const result = await this.llmRouter.call(provider, config, nodeInput, credentials);
    return {
      __engineResult: true,
      output: result.text,
      tokens: result.tokens,
    };
  }

  async _execTextClassifier(nodeData, nodeInput, credentials, settings) {
    const categories = (nodeData.categories || []).join(', ');
    const multi = nodeData.multiLabel ? 'You may assign multiple labels.' : 'Assign exactly one label.';
    const prompt = `You are a text classifier. Classify the following text into one of these categories: ${categories}. ${multi}\n\nRespond with ONLY a JSON object: {"label": "category"} (or {"labels": ["cat1","cat2"]} if multi-label). No other text.`;
    return this._execAIProcessing(prompt, nodeInput, credentials, settings);
  }

  async _execSentiment(nodeData, nodeInput, credentials, settings) {
    const gran = nodeData.granularity || 'document';
    const outputFormat = nodeData.outputFormat || 'json';
    const prompt = `You are a sentiment analyzer. Analyze the sentiment of the following text at the ${gran} level.\n\nRespond with ONLY a JSON object: {"sentiment": "positive|negative|neutral|mixed", "score": <-1.0 to 1.0>, "confidence": <0.0 to 1.0>}. No other text.`;
    const raw = await this._execAIProcessing(prompt, nodeInput, credentials, settings);

    // Post-process based on outputFormat
    if (outputFormat === 'json') return raw;
    try {
      const parsed = JSON.parse(raw);
      if (outputFormat === 'label') return parsed.sentiment || raw;
      if (outputFormat === 'score') return String(parsed.score ?? raw);
    } catch {
      // If parsing fails, return raw
    }
    return raw;
  }

  async _execInfoExtractor(nodeData, nodeInput, credentials, settings) {
    const fields = (nodeData.extractionFields || []).join(', ');
    const prompt = `You are a structured data extractor. Extract the following fields from the text: ${fields}.\n\nRespond with ONLY a JSON object containing the extracted fields. Use null for fields not found. No other text.`;
    return this._execAIProcessing(prompt, nodeInput, credentials, settings);
  }

  async _execSummarizer(nodeData, nodeInput, credentials, settings) {
    const maxLen = nodeData.maxLength || 200;
    const style = nodeData.summaryStyle || 'concise';
    const prompt = `You are a summarizer. Summarize the following text in a ${style} style. Keep the summary under ${maxLen} words. Return ONLY the summary text, no preamble.`;
    return this._execAIProcessing(prompt, nodeInput, credentials, settings);
  }

  async _execQAChain(nodeData, nodeInput, credentials, settings) {
    const style = nodeData.responseStyle || 'detailed';
    const contextSource = nodeData.contextSource || 'upstream';

    let contextText = nodeInput;
    if (contextSource === 'manual' && nodeData.manualContext) {
      // Prepend manual context, use upstream input as the question
      contextText = `Context:\n${nodeData.manualContext}\n\nQuestion:\n${nodeInput}`;
    }

    const prompt = `You are a Q&A assistant. The user has provided context and a question. Answer based ONLY on the provided context. Give a ${style} response. If the answer is not in the context, say "I don't have enough information to answer that."`;
    return this._execAIProcessing(prompt, contextText, credentials, settings);
  }

  // =========================================================================
  // v0.4.2 — Trigger Executors (passthrough in execution context)
  // =========================================================================

  _execScheduleTrigger(nodeData, userInput) {
    return userInput || `Scheduled trigger: ${nodeData.cronExpression || '0 * * * *'}`;
  }

  _execWebhookTrigger(nodeData, userInput) {
    return userInput || `Webhook: ${nodeData.webhookMethod || 'POST'} /${nodeData.webhookPath || 'webhook'}`;
  }

  _execChatTrigger(nodeData, userInput) {
    return userInput || '';
  }

  // =========================================================================
  // v0.4.2 — Data & Tool Executors
  // =========================================================================

  _execSort(nodeData, nodeInput) {
    let items;
    try {
      items = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
    } catch {
      return nodeInput;
    }
    if (!Array.isArray(items)) return nodeInput;

    const field = nodeData.sortField || 'value';
    const order = nodeData.sortOrder || 'asc';
    const sorted = [...items].sort((a, b) => {
      const va = typeof a === 'object' ? a[field] : a;
      const vb = typeof b === 'object' ? b[field] : b;
      if (va < vb) return order === 'asc' ? -1 : 1;
      if (va > vb) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  _execAggregate(nodeData, nodeInput) {
    let items;
    try {
      items = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
    } catch {
      return nodeInput;
    }
    if (!Array.isArray(items)) return nodeInput;

    const op = nodeData.aggregateOp || 'concatenate';
    const field = nodeData.aggregateField;
    const values = field ? items.map((i) => i[field]).filter((v) => v != null) : items;

    switch (op) {
      case 'sum':
        return values.reduce((s, v) => s + (parseFloat(v) || 0), 0);
      case 'average': {
        const nums = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
        return nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
      }
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values.map((v) => parseFloat(v)).filter((n) => !isNaN(n)));
      case 'max':
        return Math.max(...values.map((v) => parseFloat(v)).filter((n) => !isNaN(n)));
      case 'concatenate':
      default:
        return values.map((v) => typeof v === 'string' ? v : JSON.stringify(v)).join('\n');
    }
  }

  _execDeduplicate(nodeData, nodeInput) {
    let items;
    try {
      items = typeof nodeInput === 'string' ? JSON.parse(nodeInput) : nodeInput;
    } catch {
      return nodeInput;
    }
    if (!Array.isArray(items)) return nodeInput;

    const field = nodeData.deduplicateField;
    if (field && field !== 'auto') {
      const seen = new Set();
      return items.filter((item) => {
        const key = typeof item === 'object' ? item[field] : item;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    // Auto: use JSON stringification
    const seen = new Set();
    return items.filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _execCalculator(nodeData, nodeInput) {
    let expr = nodeData.expression || '';
    if (!expr) expr = String(nodeInput);

    // Replace variable references with the input value
    if (typeof nodeInput === 'object' && nodeInput !== null) {
      for (const [key, val] of Object.entries(nodeInput)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
      }
    } else {
      expr = expr.replace(/\binput\b/g, String(nodeInput));
    }

    // Safe math evaluation using Function constructor
    const fn = new Function(`return (${expr})`);
    return fn();
  }

  async _execSearch(nodeData, nodeInput, signal) {
    const query = typeof nodeInput === 'string' ? nodeInput : JSON.stringify(nodeInput);
    const maxResults = nodeData.maxResults || 5;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(url, { signal });
      const html = await res.text();

      // Extract result snippets from DuckDuckGo HTML
      const results = [];
      const regex = /<a[^>]+class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < maxResults) {
        results.push({
          title: match[1].trim(),
          snippet: match[2].replace(/<[^>]+>/g, '').trim(),
        });
      }

      return results.length > 0
        ? results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`).join('\n\n')
        : `No search results found for: ${query}`;
    } catch (err) {
      return `Search failed: ${err.message}`;
    }
  }

  async _execWikipedia(nodeData, nodeInput, signal) {
    const query = typeof nodeInput === 'string' ? nodeInput : String(nodeInput);
    const lang = nodeData.language || 'en';
    const sections = nodeData.sections || 'summary';
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

    try {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(url, { signal });

      if (!res.ok) {
        return `Wikipedia: No article found for "${query}"`;
      }

      const data = await res.json();

      if (sections === 'summary') {
        return `# ${data.title}\n\n${data.extract}`;
      }

      // Full article — fetch HTML and strip tags
      const fullUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(data.title)}`;
      const fullRes = await fetch(fullUrl, { signal });
      const html = await fullRes.text();
      const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `# ${data.title}\n\n${stripped.slice(0, 5000)}`;
    } catch (err) {
      return `Wikipedia lookup failed: ${err.message}`;
    }
  }
  /* ════════════════════════════════════════════════════════
     v0.7.0 — Integration Node Executors
     ════════════════════════════════════════════════════════ */

  _templateReplace(template, input) {
    return (template || '').replace(/\{\{input\}\}/g, typeof input === 'string' ? input : JSON.stringify(input));
  }

  async _execGmail(data, input, credentials, signal) {
    const apiKey = credentials?.['google-api-key'];
    if (!apiKey) return 'Error: Google API key not configured. Add it in Settings.';
    const op = data.operation || 'send';
    try {
      if (op === 'send') {
        const to = data.to || '';
        const subject = data.subject || '';
        const body = this._templateReplace(data.bodyTemplate, input);
        const raw = btoa(
          `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`
        ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw }),
          signal,
        });
        const json = await res.json();
        return res.ok ? `Email sent (ID: ${json.id})` : `Gmail error: ${json.error?.message || JSON.stringify(json)}`;
      } else if (op === 'read') {
        const label = data.labelFilter || 'INBOX';
        const max = data.maxResults || 10;
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${encodeURIComponent(label)}&maxResults=${max}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }, signal,
        });
        const json = await res.json();
        return JSON.stringify(json.messages || [], null, 2);
      } else if (op === 'search') {
        const q = data.searchQuery || input;
        const max = data.maxResults || 10;
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }, signal,
        });
        const json = await res.json();
        return JSON.stringify(json.messages || [], null, 2);
      }
      return input;
    } catch (err) {
      return `Gmail error: ${err.message}`;
    }
  }

  async _execGoogleSheets(data, input, credentials, signal) {
    const apiKey = credentials?.['google-api-key'];
    if (!apiKey) return 'Error: Google API key not configured. Add it in Settings.';
    const id = data.spreadsheetId;
    const sheet = data.sheetName || 'Sheet1';
    const range = data.range || 'A1:Z100';
    const fullRange = `${sheet}!${range}`;
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
    try {
      const op = data.operation || 'read';
      if (op === 'read') {
        const res = await fetch(`${base}/values/${encodeURIComponent(fullRange)}?key=${apiKey}`, { signal });
        const json = await res.json();
        return JSON.stringify(json.values || [], null, 2);
      } else if (op === 'write') {
        let values;
        try { values = JSON.parse(data.rowData || input); } catch { values = [[data.rowData || input]]; }
        if (!Array.isArray(values[0])) values = [values];
        const res = await fetch(`${base}/values/${encodeURIComponent(fullRange)}?valueInputOption=USER_ENTERED&key=${apiKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ values }),
          signal,
        });
        const json = await res.json();
        return res.ok ? `Written ${json.updatedCells || 0} cells` : `Sheets error: ${json.error?.message || JSON.stringify(json)}`;
      } else if (op === 'append') {
        let values;
        try { values = JSON.parse(data.rowData || input); } catch { values = [[data.rowData || input]]; }
        if (!Array.isArray(values[0])) values = [values];
        const res = await fetch(`${base}/values/${encodeURIComponent(fullRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ values }),
          signal,
        });
        const json = await res.json();
        return res.ok ? `Appended ${json.updates?.updatedRows || 0} rows` : `Sheets error: ${json.error?.message || JSON.stringify(json)}`;
      } else if (op === 'update') {
        let values;
        try { values = JSON.parse(data.rowData || input); } catch { values = [[data.rowData || input]]; }
        if (!Array.isArray(values[0])) values = [values];
        const res = await fetch(`${base}/values/${encodeURIComponent(fullRange)}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ values }),
          signal,
        });
        const json = await res.json();
        return res.ok ? `Updated ${json.updatedCells || 0} cells` : `Sheets error: ${json.error?.message || JSON.stringify(json)}`;
      }
      return input;
    } catch (err) {
      return `Google Sheets error: ${err.message}`;
    }
  }

  async _execYouTube(data, input, credentials, signal) {
    const apiKey = credentials?.['google-api-key'];
    if (!apiKey) return 'Error: Google API key not configured. Add it in Settings.';
    const base = 'https://www.googleapis.com/youtube/v3';
    try {
      const op = data.operation || 'search';
      if (op === 'search') {
        const q = data.query || input;
        const max = data.maxResults || 5;
        const res = await fetch(`${base}/search?part=snippet&type=video&q=${encodeURIComponent(q)}&maxResults=${max}&key=${apiKey}`, { signal });
        const json = await res.json();
        if (!res.ok) return `YouTube error: ${json.error?.message || JSON.stringify(json)}`;
        return (json.items || []).map((v) => `${v.snippet.title} (https://youtu.be/${v.id.videoId})`).join('\n');
      } else if (op === 'info') {
        const vid = data.videoId || input;
        const res = await fetch(`${base}/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(vid)}&key=${apiKey}`, { signal });
        const json = await res.json();
        if (!res.ok) return `YouTube error: ${json.error?.message || JSON.stringify(json)}`;
        const item = json.items?.[0];
        if (!item) return 'Video not found.';
        return JSON.stringify({ title: item.snippet.title, description: item.snippet.description, views: item.statistics.viewCount, likes: item.statistics.likeCount, duration: item.contentDetails.duration }, null, 2);
      } else if (op === 'captions') {
        const vid = data.videoId || input;
        const lang = data.captionLanguage || 'en';
        const res = await fetch(`${base}/captions?part=snippet&videoId=${encodeURIComponent(vid)}&key=${apiKey}`, { signal });
        const json = await res.json();
        if (!res.ok) return `YouTube error: ${json.error?.message || JSON.stringify(json)}`;
        const captions = (json.items || []).filter((c) => c.snippet.language === lang);
        return captions.length > 0
          ? `Found ${captions.length} caption track(s) for "${lang}": ${captions.map((c) => c.snippet.name || c.id).join(', ')}`
          : `No captions found for language "${lang}". Available: ${(json.items || []).map((c) => c.snippet.language).join(', ')}`;
      }
      return input;
    } catch (err) {
      return `YouTube error: ${err.message}`;
    }
  }

  async _execSlack(data, input, credentials, signal) {
    const token = credentials?.['slack-bot-token'];
    if (!token) return 'Error: Slack Bot Token not configured. Add it in Settings.';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const op = data.operation || 'send';
      if (op === 'send') {
        const channel = data.channel || '';
        const text = this._templateReplace(data.messageTemplate, input);
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST', headers, body: JSON.stringify({ channel, text }), signal,
        });
        const json = await res.json();
        return json.ok ? `Message sent to ${channel} (ts: ${json.ts})` : `Slack error: ${json.error}`;
      } else if (op === 'read') {
        const channel = data.channel || '';
        const limit = data.maxResults || 20;
        const res = await fetch(`https://slack.com/api/conversations.history?channel=${encodeURIComponent(channel)}&limit=${limit}`, {
          headers, signal,
        });
        const json = await res.json();
        if (!json.ok) return `Slack error: ${json.error}`;
        return (json.messages || []).map((m) => `[${m.user}] ${m.text}`).join('\n');
      } else if (op === 'channels') {
        const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
          headers, signal,
        });
        const json = await res.json();
        if (!json.ok) return `Slack error: ${json.error}`;
        return (json.channels || []).map((c) => `#${c.name} (${c.id})`).join('\n');
      }
      return input;
    } catch (err) {
      return `Slack error: ${err.message}`;
    }
  }

  async _execTelegram(data, input, credentials, signal) {
    const token = credentials?.['telegram-bot-token'];
    if (!token) return 'Error: Telegram Bot Token not configured. Add it in Settings.';
    const base = `https://api.telegram.org/bot${token}`;
    try {
      const op = data.operation || 'send_message';
      if (op === 'send_message') {
        const chatId = data.chatId || '';
        const text = this._templateReplace(data.messageTemplate, input);
        const res = await fetch(`${base}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
          signal,
        });
        const json = await res.json();
        return json.ok ? `Message sent (message_id: ${json.result.message_id})` : `Telegram error: ${json.description}`;
      } else if (op === 'send_photo') {
        const chatId = data.chatId || '';
        const photo = data.photoUrl || input;
        const caption = data.messageTemplate || '';
        const res = await fetch(`${base}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, photo, caption }),
          signal,
        });
        const json = await res.json();
        return json.ok ? `Photo sent (message_id: ${json.result.message_id})` : `Telegram error: ${json.description}`;
      } else if (op === 'get_updates') {
        const res = await fetch(`${base}/getUpdates?limit=20`, { signal });
        const json = await res.json();
        if (!json.ok) return `Telegram error: ${json.description}`;
        return (json.result || []).map((u) => {
          const msg = u.message;
          return msg ? `[${msg.from?.first_name || 'Unknown'}] ${msg.text || '(media)'}` : JSON.stringify(u);
        }).join('\n');
      }
      return input;
    } catch (err) {
      return `Telegram error: ${err.message}`;
    }
  }

  async _execAirtable(data, input, credentials, signal) {
    const apiKey = credentials?.['airtable-api-key'];
    if (!apiKey) return 'Error: Airtable API Key not configured. Add it in Settings.';
    const baseId = data.baseId || '';
    const table = encodeURIComponent(data.tableName || '');
    const base = `https://api.airtable.com/v0/${baseId}/${table}`;
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    try {
      const op = data.operation || 'list';
      if (op === 'list') {
        const filter = data.filterFormula ? `?filterByFormula=${encodeURIComponent(data.filterFormula)}` : '';
        const res = await fetch(`${base}${filter}`, { headers, signal });
        const json = await res.json();
        if (json.error) return `Airtable error: ${json.error.message || JSON.stringify(json.error)}`;
        return JSON.stringify((json.records || []).map((r) => ({ id: r.id, ...r.fields })), null, 2);
      } else if (op === 'create') {
        let fields;
        try { fields = JSON.parse(data.fields || input); } catch { fields = { Note: data.fields || input }; }
        const res = await fetch(base, {
          method: 'POST', headers,
          body: JSON.stringify({ records: [{ fields }] }),
          signal,
        });
        const json = await res.json();
        if (json.error) return `Airtable error: ${json.error.message || JSON.stringify(json.error)}`;
        return `Created record: ${json.records?.[0]?.id || 'unknown'}`;
      } else if (op === 'update') {
        const recordId = data.recordId || '';
        let fields;
        try { fields = JSON.parse(data.fields || input); } catch { fields = { Note: data.fields || input }; }
        const res = await fetch(`${base}/${recordId}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ fields }),
          signal,
        });
        const json = await res.json();
        if (json.error) return `Airtable error: ${json.error.message || JSON.stringify(json.error)}`;
        return `Updated record: ${json.id}`;
      } else if (op === 'delete') {
        const recordId = data.recordId || '';
        const res = await fetch(`${base}/${recordId}`, {
          method: 'DELETE', headers, signal,
        });
        const json = await res.json();
        if (json.error) return `Airtable error: ${json.error.message || JSON.stringify(json.error)}`;
        return `Deleted record: ${json.id}`;
      }
      return input;
    } catch (err) {
      return `Airtable error: ${err.message}`;
    }
  }
}

module.exports = AgentEngine;
