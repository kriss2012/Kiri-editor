/**
 * Agent Worker Logic (Real AI powered by Google Gemini)
 * Phase 4 Implementation: Transition from Simulation to Real Intelligence
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "INSERT_KEY_HERE");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
 * Run an agent task using Gemini API with streaming
 */
async function runAgent(agentType, inputData, fileName, onChunk) {
  const agent = agents[agentType];
  if (!agent) throw new Error(`Unknown agent type: ${agentType}`);

  const promptText = agent.prompt(inputData || '// (empty file)', fileName || 'untitled.js');

  try {
    const result = await model.generateContentStream(promptText);
    let fullText = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      if (onChunk) onChunk(chunkText);
    }

    return fullText;
  } catch (err) {
    console.error(`[Gemini API Error] ${err.message}`);
    throw new Error(`AI Agent failed: ${err.message}. Ensure GEMINI_API_KEY is configured.`);
  }
}

module.exports = { runAgent };
