/**
 * Agent Worker Logic (Powered by OpenRouter)
 * Phase 5 Implementation: Managed AI with OpenRouter and Redis Caching
 */

const OpenAI = require("openai");
const crypto = require('crypto');
const { getCachedResult, setCachedResult } = require('./cache');
require('dotenv').config();

// Initialize OpenRouter Client (OpenAI standard)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "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",
  defaultHeaders: {
    "HTTP-Referer": "https://kiri-editor.io", // Optional
    "X-Title": "Kiri Editor", // Optional
  }
});

const DEFAULT_MODEL = "google/gemini-flash-1.5"; // Efficient for coding/analysis

const agents = {
  documentation: {
    name: 'Documentation Agent',
    prompt: (input, fileName) => `Analyze the following code from file "${fileName}" and generate a comprehensive markdown documentation. Include an overview, list of functions, classes, and usage examples.\n\nCode:\n${input}`
  },
  code: {
    name: 'Code Agent',
    prompt: (input, fileName) => `You are a Senior Software Engineer. Refactor and improve the following code from file "${fileName}". Focus on performance, readability, and modern best practices. Return the full refactored code in a markdown block.\n\nCode:\n${input}`
  },
  explanation: {
    name: 'Explanation Agent',
    prompt: (input, fileName) => `Explain the following code from file "${fileName}" in plain English. Break down the logic, detected patterns (like async/await or classes), and analyze the complexity.\n\nCode:\n${input}`
  },
  search: {
    name: 'Search Agent',
    prompt: (input, fileName) => `Search for information and patterns related to this code query in file "${fileName}". Provide related documentation links and suggest best-practice resources.\n\nQuery:\n${input}`
  },
  debug: {
    name: 'Debug Agent',
    prompt: (input, fileName) => `Identify potential bugs, security vulnerabilities, or quality issues in the following code from file "${fileName}". Provide a report with severity levels and suggested fixes.\n\nCode:\n${input}`
  },
  test: {
    name: 'Test Agent',
    prompt: (input, fileName) => `Generate a complete Jest or Pytest test suite for the following code from file "${fileName}". Include unit tests, edge cases, and run instructions.\n\nCode:\n${input}`
  }
};

/**
 * Generate a hash for inputs to facilitate caching
 */
function getInputHash(inputData) {
  return crypto.createHash('md5').update(inputData || '').digest('hex');
}

/**
 * Run an agent task using OpenRouter with streaming and Redis caching
 */
async function runAgent(agentType, inputData, fileName, onChunk) {
  const agent = agents[agentType];
  if (!agent) throw new Error(`Unknown agent type: ${agentType}`);

  const inputHash = getInputHash(inputData);
  const promptText = agent.prompt(inputData || '// (empty file)', fileName || 'untitled.js');

  // 1. Check Redis Cache First
  const cached = await getCachedResult(agentType, fileName, inputHash);
  if (cached) {
    console.log(`[Cache Hit] Serving result for ${agentType} on ${fileName}`);
    if (onChunk) onChunk(cached);
    return cached;
  }

  // 2. If not cached, call OpenRouter
  console.log(`[Cache Miss] Calling OpenRouter for ${agentType} on ${fileName}`);
  try {
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are an AI assistant integrated into a code editor. Provide helpful, accurate, and concise markdown responses." },
        { role: "user", content: promptText }
      ],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        if (onChunk) onChunk(content);
      }
    }

    // 3. Save result to cache
    await setCachedResult(agentType, fileName, inputHash, fullText);

    return fullText;
  } catch (err) {
    console.error(`[OpenRouter Error] ${err.message}`);
    throw new Error(`AI Agent failed via OpenRouter: ${err.message}. Check your API key.`);
  }
}

module.exports = { runAgent };
