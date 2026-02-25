/**
 * Converts a chatbot configuration into an agent flow
 * (InputNode -> MemoryNode -> LLMNode -> OutputNode)
 * with an auto-generated system prompt.
 */

export function generateSystemPrompt(config) {
  const parts = [];

  parts.push(`You are a customer support assistant for ${config.businessName || 'this business'}.`);

  if (config.businessDescription) {
    parts.push(config.businessDescription);
  }

  if (config.industry) {
    parts.push(`Industry: ${config.industry}.`);
  }

  // FAQ knowledge
  if (config.faqs?.length > 0) {
    parts.push('\nFAQ Knowledge:');
    config.faqs.forEach((faq) => {
      parts.push(`Q: ${faq.question}\nA: ${faq.answer}`);
    });
  }

  // Products
  if (config.products?.length > 0) {
    parts.push('\nProducts/Services:');
    config.products.forEach((p) => {
      const price = p.price ? ` ($${p.price})` : '';
      parts.push(`- ${p.name}${price}: ${p.description || ''}`);
    });
  }

  // Custom instructions
  if (config.customInstructions) {
    parts.push(`\nAdditional Instructions:\n${config.customInstructions}`);
  }

  // Behavior
  const toneMap = {
    professional: 'Maintain a professional and helpful tone.',
    friendly: 'Be warm, friendly, and approachable.',
    casual: 'Use a casual, conversational tone.',
    formal: 'Use formal language appropriate for business communication.',
  };
  parts.push(`\n${toneMap[config.tone] || toneMap.professional}`);
  parts.push(`Keep responses under ${config.maxResponseLength || 150} words.`);

  if (config.escalationEmail) {
    parts.push(`If a customer needs human assistance, direct them to: ${config.escalationEmail}`);
  }

  parts.push('\nIf you are unsure about something, be honest and offer to connect the customer with a human agent.');

  return parts.join('\n');
}

export function configToAgentFlow(config) {
  const systemPrompt = generateSystemPrompt(config);

  const nodes = [
    {
      id: 'input-1',
      type: 'InputNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Customer Message',
        inputType: 'text',
        description: 'Incoming customer message',
      },
    },
    {
      id: 'memory-1',
      type: 'MemoryNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Chat History',
        memoryType: 'buffer',
        maxMessages: 20,
      },
    },
    {
      id: 'llm-1',
      type: 'LLMNode',
      position: { x: 600, y: 200 },
      data: {
        label: `${config.businessName || 'Chatbot'} AI`,
        provider: config.provider || 'claude',
        model: config.model || 'claude-sonnet-4-6',
        systemPrompt,
        temperature: 0.5,
        maxTokens: 1024,
      },
    },
    {
      id: 'output-1',
      type: 'OutputNode',
      position: { x: 850, y: 200 },
      data: {
        label: 'Response',
        outputFormat: 'text',
      },
    },
  ];

  const edges = [
    { id: 'e-input-memory', source: 'input-1', target: 'memory-1', type: 'smoothstep', animated: true },
    { id: 'e-memory-llm', source: 'memory-1', target: 'llm-1', type: 'smoothstep', animated: true },
    { id: 'e-llm-output', source: 'llm-1', target: 'output-1', type: 'smoothstep', animated: true },
  ];

  return { nodes, edges };
}
