/**
 * Agent Worker Service
 * Connects to LLM (Gemini or Groq) to act as a proper Vibe Coding App
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function callLLM(prompt, codeContext, fileName, userRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  
  const systemPrompt = `You are a Vibe Coding Agent.
Respond ONLY with valid JSON in this exact format:
{
  "explanation": "Markdown explanation of what you did",
  "files": [
    { "path": "filename", "content": "full updated file content" }
  ],
  "commands": ["any terminal commands to run"]
}
Current File: ${fileName}
Current Code:
${codeContext}
`;

  const fullPrompt = `${systemPrompt}\nUser Request: ${userRequest}\n\nONLY output raw JSON. No markdown backticks, no markdown JSON block!`;

  let lastError = null;

  try {
    // Try Gemini First
    if (geminiKey) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(`Gemini API Error: ${data.error?.message || JSON.stringify(data)}`);
        }
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error(`Gemini API returned no candidates: ${JSON.stringify(data)}`);
        }
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        return JSON.parse(text);
      } catch (err) {
        console.warn("Gemini Failed, falling back to Groq if available:", err.message);
        lastError = err;
      }
    }

    // Fallback to Groq
    if (groqKey) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `User Request: ${userRequest}\n\nRemember: ONLY output raw JSON. No markdown blocks.` }
            ],
            response_format: { type: 'json_object' }
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(`Groq API Error: ${data.error?.message || JSON.stringify(data)}`);
        }
        if (!data.choices || data.choices.length === 0) {
          throw new Error(`Groq API returned no choices: ${JSON.stringify(data)}`);
        }
        return JSON.parse(data.choices[0].message.content);
      } catch (err) {
        console.warn("Groq Failed:", err.message);
        lastError = err;
      }
    }

    // If neither key exists
    if (!geminiKey && !groqKey) {
      return {
        explanation: "### ❌ Missing API Key\nTo use the actual Vibe Coding Agent, please add `GEMINI_API_KEY` or `GROQ_API_KEY` to your `.env` file and restart the server.\n\n*Currently running in offline simulation mode.*",
        files: [{ path: fileName, content: codeContext + '\n\n// TODO: Configure API key for real AI generation' }],
        commands: []
      };
    }

    // If both failed
    throw lastError;
  } catch (err) {
    console.error("LLM Error:", err);
    return {
      explanation: `### ❌ LLM Error\nAn error occurred while generating code: ${err.message}`,
      files: [],
      commands: []
    };
  }
}

async function runAgent(agentType, inputData, fileName, prompt, onChunk) {
  if (!prompt) prompt = "Review and improve this file.";
  
  if (onChunk) onChunk("🤖 Connecting to AI Engine...\n\n", "chunk");
  
  const result = await callLLM(prompt, inputData, fileName, prompt);
  
  let explanation = result.explanation;
  if (result.commands && result.commands.length > 0) {
     explanation += `\n\n### 🔧 Commands to run:\n${result.commands.map(c => `- ` + c).join('\n')}`;
  }
  
  const code = result.files && result.files.length > 0 ? result.files[0].content : inputData;

  // 1. Stream the explanation into chat
  const expChunkSize = 40;
  for (let i = 0; i < explanation.length; i += expChunkSize) {
    const chunk = explanation.slice(i, i + expChunkSize);
    if (onChunk) onChunk(chunk, 'chunk');
    await new Promise(r => setTimeout(r, 10));
  }

  // Removed code streaming to prevent overwriting active file.
  // The route will handle the files via 'files-updated' event.

  return { 
    explanation, 
    code, 
    files: result.files || [],
    commands: result.commands || []
  };
}

const agents = {
  code: { name: 'Vibe Code Agent', icon: '⚡', color: '#a5d6a7', process: () => {} },
  documentation: { name: 'Documentation Agent', icon: '📝', color: '#4fc3f7', process: () => {} },
  debug: { name: 'Debug Agent', icon: '🐛', color: '#ef9a9a', process: () => {} },
  test: { name: 'Test Agent', icon: '🧪', color: '#80cbc4', process: () => {} },
  explanation: { name: 'Explanation Agent', icon: '💡', color: '#fff176', process: () => {} },
  search: { name: 'Search Agent', icon: '🔍', color: '#ce93d8', process: () => {} }
};

module.exports = { runAgent, agents };
