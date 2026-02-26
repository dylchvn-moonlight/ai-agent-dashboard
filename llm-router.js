// llm-router.js — LLM API router (CommonJS, Electron main process)
// Routes LLM calls to Claude, OpenAI, MiniMax, Kimi, or a local endpoint.

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  Anthropic = null;
}

class LLMRouter {
  /**
   * Call an LLM provider and return a normalised result.
   * @param {string} provider - 'claude' | 'openai' | 'local'
   * @param {object} config   - { model, systemPrompt, temperature, maxTokens }
   * @param {string} input    - The user/message text to send
   * @param {object} credentials - { anthropicKey, openaiKey, localEndpoint }
   * @returns {Promise<{ text: string, tokens: { input: number, output: number }, latency: number }>}
   */
  async call(provider, config, input, credentials) {
    const start = Date.now();

    switch (provider) {
      case 'claude':
        return this._callClaude(config, input, credentials, start);
      case 'openai':
        return this._callOpenAI(config, input, credentials, start);
      case 'local':
        return this._callLocal(config, input, credentials, start);
      case 'minimax':
        return this._callMiniMax(config, input, credentials, start);
      case 'kimi':
        return this._callKimi(config, input, credentials, start);
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Claude (Anthropic SDK)
  // ---------------------------------------------------------------------------
  async _callClaude(config, input, credentials, start) {
    if (!Anthropic) {
      throw new Error(
        'Anthropic SDK is not installed. Run: npm install @anthropic-ai/sdk'
      );
    }
    if (!credentials['anthropic-api-key']) {
      throw new Error('Anthropic API key is not configured.');
    }

    const client = new Anthropic({ apiKey: credentials['anthropic-api-key'] });

    const model = config.model || 'claude-sonnet-4-6';
    const maxTokens = config.maxTokens || 4096;
    const temperature = config.temperature ?? 0.7;
    const systemPrompt = config.systemPrompt || '';

    const messages = [{ role: 'user', content: input }];

    const requestParams = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    // Anthropic SDK: system goes at the top level, not inside messages
    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }
    if (typeof temperature === 'number') {
      requestParams.temperature = temperature;
    }

    const response = await client.messages.create(requestParams);

    const text =
      response.content && response.content.length > 0
        ? response.content[0].text
        : '';

    const tokens = {
      input: response.usage?.input_tokens || 0,
      output: response.usage?.output_tokens || 0,
    };

    return {
      text,
      tokens,
      latency: Date.now() - start,
    };
  }

  // ---------------------------------------------------------------------------
  // OpenAI (fetch to REST API)
  // ---------------------------------------------------------------------------
  async _callOpenAI(config, input, credentials, start) {
    const apiKey = credentials['openai-api-key'];
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    const model = config.model || 'gpt-4o';
    const maxTokens = config.maxTokens || 4096;
    const temperature = config.temperature ?? 0.7;
    const systemPrompt = config.systemPrompt || '';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const text =
      data.choices && data.choices.length > 0
        ? data.choices[0].message?.content || ''
        : '';

    const tokens = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    };

    return {
      text,
      tokens,
      latency: Date.now() - start,
    };
  }

  // ---------------------------------------------------------------------------
  // Local / self-hosted (OpenAI-compatible endpoint)
  // ---------------------------------------------------------------------------
  async _callLocal(config, input, credentials, start) {
    const endpoint = credentials['local-endpoint-url'] || 'http://localhost:1234';
    const url = `${endpoint.replace(/\/+$/, '')}/v1/chat/completions`;

    const model = config.model || 'local-model';
    const maxTokens = config.maxTokens || 4096;
    const temperature = config.temperature ?? 0.7;
    const systemPrompt = config.systemPrompt || '';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Local LLM error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const text =
      data.choices && data.choices.length > 0
        ? data.choices[0].message?.content || ''
        : '';

    const tokens = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    };

    return {
      text,
      tokens,
      latency: Date.now() - start,
    };
  }

  // ---------------------------------------------------------------------------
  // MiniMax (OpenAI-compatible, dual auth: OAuth token or API key)
  // ---------------------------------------------------------------------------
  async _callMiniMax(config, input, credentials, start) {
    // OAuth token takes priority over static API key
    const apiKey =
      credentials['minimax-oauth-token'] || credentials['minimax-api-key'];

    if (!apiKey) {
      throw new Error(
        'MiniMax API key is not configured. Add an API key or sign in with OAuth in Settings.'
      );
    }

    const model = config.model || 'MiniMax-M2.5';
    const maxTokens = config.maxTokens || 4096;
    const temperature = config.temperature ?? 0.7;
    const systemPrompt = config.systemPrompt || '';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const response = await fetch(
      'https://api.minimax.io/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: maxTokens,
          temperature,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `MiniMax API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const text =
      data.choices && data.choices.length > 0
        ? data.choices[0].message?.content || ''
        : '';

    // MiniMax may return input_tokens/output_tokens or prompt_tokens/completion_tokens
    const tokens = {
      input: data.usage?.input_tokens || data.usage?.prompt_tokens || 0,
      output: data.usage?.output_tokens || data.usage?.completion_tokens || 0,
    };

    return {
      text,
      tokens,
      latency: Date.now() - start,
    };
  }
  // ---------------------------------------------------------------------------
  // Kimi / Moonshot AI (OpenAI-compatible)
  // ---------------------------------------------------------------------------
  async _callKimi(config, input, credentials, start) {
    const apiKey = credentials['kimi-api-key'];
    if (!apiKey) {
      throw new Error('Kimi (Moonshot) API key is not configured.');
    }

    const model = config.model || 'moonshot-v1-128k';
    const maxTokens = config.maxTokens || 4096;
    // Kimi temperature range: 0.0–1.0
    const temperature = Math.min(1.0, Math.max(0.0, config.temperature ?? 0.7));
    const systemPrompt = config.systemPrompt || '';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const response = await fetch(
      'https://api.moonshot.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Kimi API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const text =
      data.choices && data.choices.length > 0
        ? data.choices[0].message?.content || ''
        : '';

    const tokens = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    };

    return {
      text,
      tokens,
      latency: Date.now() - start,
    };
  }
}

module.exports = LLMRouter;
