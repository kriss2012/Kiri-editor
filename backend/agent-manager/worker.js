/**
 * Agent Worker Logic (Powered by OpenRouter)
 * Phase 5 Implementation: Managed AI with OpenRouter and Redis Caching
 */

const OpenAI = require("openai");
const crypto = require('crypto');
const { getCachedResult, setCachedResult } = require('./cache');
require('dotenv').config();

// Initialize OpenRouter Client (OpenAI standard)
const apiKey = process.env.OPENROUTER_API_KEY;
const isSimulation = !apiKey || apiKey.includes('sk-or-v1-95235b7c'); // Consider the placeholder as simulation

const openai = apiKey ? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://kiri-editor.io",
    "X-Title": "Kiri Editor",
  }
}) : null;

const DEFAULT_MODEL = "google/gemini-flash-1.5"; // Efficient for coding/analysis

const agents = {
  documentation: {
    name: 'Documentation Agent',
    prompt: (input, fileName) => `
You are a Technical Documentation Expert.
Analyze the provided code from file: "${fileName}".
Generate a high-fidelity documentation in Markdown format:
1. **Module Overview**: Purpose of this code.
2. **Function/Method Reference**: Name, parameters, return types, and detailed behavior.
3. **Complexity Analysis**: Time and space complexity.
4. **Usage Examples**: Real-world integration examples.
Use professional tone and clear hierarchical structure.

Code:
${input}`
  },
  code: {
    name: 'Code Agent',
    prompt: (input, fileName) => `
You are a Senior Software Architect.
Review and refactor the code from file: "${fileName}".
Ensure it follows:
1. **Modern Patterns**: ES6+/Pythonic ways or equivalent.
2. **Performance**: Optimize loops and resource usage.
3. **Readability**: Consistent naming and clean structure (SOLID/DRY).
4. **Docstrings**: Add descriptive JSDoc or Python docstrings.
Return ONLY the full refactored code block in Markdown.

Code:
${input}`
  },
  explanation: {
    name: 'Explanation Agent',
    prompt: (input, fileName) => `
You are a Code Mentor.
Provide a deep technical breakdown of file: "${fileName}".
Explain:
1. **Mental Model**: How to think about this code.
2. **Control Flow**: Step-by-step logic.
3. **Advanced Features**: Explain any closures, decorators, or advanced patterns used.
4. **Context**: How this might interact with other parts of a typical system.
Use clear headers and bullet points.

Code:
${input}`
  },
  search: {
    name: 'Search Agent',
    prompt: (input, fileName) => `
You are an Information Retrieval specialist.
Analyze the following query regarding file: "${fileName}".
Provide:
1. **Pattern Matching**: Find where the query concepts appear in the code.
2. **Expert Resources**: Links or mentions of official docs for the APIs used.
3. **Best Practices**: Current industry standards for this specific problem.

Query:
${input}`
  },
  debug: {
    name: 'Debug Agent',
    prompt: (input, fileName) => `
You are a Senior QA Engineer (SDET).
Perform a deep static analysis of file: "${fileName}".
Identify:
1. **Logic Bugs**: Edge cases, race conditions, or off-by-one errors.
2. **Security**: OWASP Top 10 risks (injection, hardcoded secrets, etc).
3. **Reliability**: Missing error handling or unhandled promises.
Format as a **Vulnerability Report** with Severity (Low/Medium/High) and Recommended Fixes.

Code:
${input}`
  },
  test: {
    name: 'Test Agent',
    prompt: (input, fileName) => `
You are a Lead Test Engineer.
Generate a comprehensive test suite for file: "${fileName}" using appropriate frameworks (Jest, Pytest, etc).
Include:
1. **Positive Tests**: Standard success paths.
2. **Edge Cases**: Empty inputs, overflow, nulls.
3. **Negative Tests**: Expected errors and exceptions.
4. **Mocking**: Suggest mocks for external dependencies.
Return the full test code in Markdown.

Code:
${input}`
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

  // 2. If simulation mode, return mock data
  if (isSimulation) {
    console.log(`[Simulation Mode] Generating mock response for ${agentType}`);
    const mockResponse = `### [SIMULATION] ${agent.name} Result\n\n` + 
      `This is a simulated response because no valid \`OPENROUTER_API_KEY\` was found.\n\n` +
      `**Analysis of ${fileName}:**\n` +
      `- Code length: ${inputData?.length || 0} characters\n` +
      `- Status: Professional logic detected\n` +
      `- Recommendation: Add a real API key to \`backend/agent-manager/.env\` for live AI analysis.\n\n` +
      `*Sample output for ${agentType}:*\n` +
      `The code in ${fileName} demonstrates a robust microservices pattern. However, ensure that all error boundaries are handled correctly in production.*`;
    
    if (onChunk) {
      // Stream mock response slowly for effect
      const chunks = mockResponse.split(' ');
      for (const word of chunks) {
        onChunk(word + ' ');
        // await new Promise(r => setTimeout(r, 10)); // Optional: simulated delay
      }
    }
    
    await setCachedResult(agentType, fileName, inputHash, mockResponse);
    return mockResponse;
  }

  // 3. Otherwise, call OpenRouter
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
