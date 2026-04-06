/**
 * Kiri Editor Orchestrator Service
 * Phase 6 Implementation: Multi-Agent Task Decomposition & Execution
 */

const OpenAI = require("openai");
const { runAgent } = require("../worker");
require('dotenv').config();

// Use a high-reasoning model for the orchestration layer
const ORCHESTRATOR_MODEL = "anthropic/claude-3.5-sonnet"; 

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "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",
});

/**
 * Decomposes a complex user request into individual agent tasks
 * @param {string} userPrompt - Original user request
 * @param {object} context - Project context (files, current file, etc.)
 * @returns {Promise<Array>} - List of executed results
 */
async function orchestrateTask(userPrompt, context, onStep) {
  console.log(`[Orchestrator] Decomposing task: "${userPrompt}"`);

  try {
    // 1. Task Decomposition Phase
    const response = await openai.chat.completions.create({
      model: ORCHESTRATOR_MODEL,
      messages: [
        {
          role: "system",
          content: `You are the Kiri Editor Orchestrator. 
Available agents:
- documentation: Generates markdown docs for existing code.
- code: Refactors, improves, or generates new code.
- explanation: Explains code logic and patterns.
- search: Searches for info, best practices, or related patterns.
- debug: Identifies bugs, vulnerabilities, or logic errors.
- test: Generates comprehensive unit tests.

Goal: Decompose the user prompt into a sequential plan of agent calls.
Output format (JSON): { "plan": [ { "agent": "agent_name", "input": "prompt_for_agent", "file": "filename" } ] }`
        },
        {
          role: "user",
          content: `User Prompt: ${userPrompt}\n\nContext Files: ${JSON.stringify(context.files || [])}\nActive File: ${context.currentFile || 'none'}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const { plan } = JSON.parse(response.choices[0].message.content);
    console.log(`[Orchestrator] Generated plan with ${plan.length} steps.`);

    const finalResults = [];

    // 2. Execution Phase
    for (const step of plan) {
      if (onStep) onStep({ status: 'starting', agent: step.agent, file: step.file });

      console.log(`[Orchestrator] Step ${finalResults.length + 1}: ${step.agent} on ${step.file}`);
      
      // Use the existing runAgent which handles caching and streaming
      const result = await runAgent(step.agent, step.input, step.file);
      
      finalResults.push({
        agent: step.agent,
        file: step.file,
        result: result
      });

      if (onStep) onStep({ status: 'completed', agent: step.agent, file: step.file, result: result });
    }

    return finalResults;

  } catch (error) {
    console.error(`[Orchestrator Error] ${error.message}`);
    throw new Error(`Orchestration failed: ${error.message}`);
  }
}

module.exports = { orchestrateTask };
