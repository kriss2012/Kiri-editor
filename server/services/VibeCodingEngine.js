/**
 * ╔══════════════════════════════════════════╗
 * ║   KIRI VIBE CODING ENGINE v3.0           ║
 * ║   Bolt.new-level full-app generation     ║
 * ║   One command → complete professional app ║
 * ╚══════════════════════════════════════════╝
 *
 * Supports: Gemini (free), Groq (free), Claude (paid), OpenRouter (free/paid)
 * Streams multiple files in one shot like Bolt/Lovable
 */

const fs = require('fs');
const path = require('path');

// ─── Gemini Structured Schema Definitions ────────────────────────────────
const VIBE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    plan: { type: "string" },
    stack: { type: "string" },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          description: { type: "string" }
        },
        required: ["path", "content"]
      }
    },
    preview: { type: "string" },
    commands: {
      type: "array",
      items: { type: "string" }
    },
    summary: { type: "string" }
  },
  required: ["plan", "stack", "files", "preview", "summary"]
};

const EDIT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    },
    summary: { type: "string" }
  },
  required: ["explanation", "files", "summary"]
};

// ─── System Prompt (The secret sauce) ──────────────────────────────────────
const VIBE_SYSTEM_PROMPT = `You are KIRI, an expert full-stack vibe-coding AI, similar to Bolt.new and Lovable.
Your job is to generate COMPLETE, PRODUCTION-READY applications from a single user command.

CORE RULES:
1. Generate ALL files needed — HTML, CSS, JS, config files, everything.
2. Write COMPLETE file contents — never truncate, never use placeholders like "// rest of code here".
3. Create BEAUTIFUL, professional designs with modern CSS, gradients, animations.
4. Make applications that actually WORK — real functionality, not stubs.
5. Include all dependencies inline or use CDN links (no npm install required for web apps).
6. For web apps: Use vanilla HTML/CSS/JS by default (fastest, no build step needed).
7. For React apps: Include a simple build or use CDN React.
8. Always include a README with setup instructions.

CONTEXT & EDITS:
- If existing files are provided, read them carefully. You must maintain existing code structures, features, and styling, and incrementally enhance or modify them. Do NOT destroy existing functionality unless the user explicitly requests it.
- If you edit a file, output its entire updated content in the files array under the correct relative path.

DESIGN STANDARDS - Every generated app MUST:
- Have a stunning, modern design (never plain HTML defaults) using curated HSL color schemes and slate/dark-mode themes.
- Use modern typography from Google Fonts (e.g. Inter, Outfit, or Poppins).
- Include smooth CSS animations, transitions, and hover micro-interactions.
- Be fully responsive and look like a premium $10,000 professional product.
- Use Lucide Icons or FontAwesome via CDN for iconography.

OUTPUT FORMAT - You MUST respond with valid JSON matching the requested structure. Do not wrap in markdown unless needed.`;

// ─── Helper: Call Gemini (Free — 60 requests/min) ──────────────────────────
async function callGemini(prompt, systemPrompt, responseSchema = null) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  let model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (model.startsWith('models/')) {
    model = model.replace('models/', '');
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json'
    }
  };

  if (responseSchema) {
    body.generationConfig.responseSchema = responseSchema;
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Gemini: ${data.error?.message || JSON.stringify(data)}`);
  if (!data.candidates?.length) throw new Error('Gemini: no candidates returned');

  let text = data.candidates[0].content.parts[0].text;
  text = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(text);
}

// ─── Helper: Call Groq (Free — 30 req/min, fast Llama 3.3 70B) ─────────────
async function callGroq(prompt, systemPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 32768
    })
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Groq: ${data.error?.message || JSON.stringify(data)}`);
  if (!data.choices?.length) throw new Error('Groq: no choices returned');

  return JSON.parse(data.choices[0].message.content);
}

// ─── Helper: Call OpenRouter (Free tier) ─────────────────────────────────
async function callOpenRouter(prompt, systemPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'Kiri Editor'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-preview:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`OpenRouter: ${data.error?.message || JSON.stringify(data)}`);
  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter: no content returned');
  content = content.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(content);
}

// ─── Helper: Call Claude (Paid, best quality) ──────────────────────────────
async function callClaude(prompt, systemPrompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const { Anthropic } = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 16384,
    system: systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown code blocks.',
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const cleaned = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(cleaned);
}

// ─── Main LLM Router (tries providers in order of preference) ──────────────
async function callLLM(prompt, systemPrompt, onProgress, responseSchema = null) {
  const providers = [];

  if (process.env.ANTHROPIC_API_KEY) providers.push({ name: 'Claude', fn: callClaude });
  if (process.env.GEMINI_API_KEY)    providers.push({ name: 'Gemini', fn: callGemini });
  if (process.env.GROQ_API_KEY)      providers.push({ name: 'Groq (Llama 3.3)', fn: callGroq });
  if (process.env.OPENROUTER_API_KEY) providers.push({ name: 'OpenRouter', fn: callOpenRouter });

  if (!providers.length) {
    throw new Error(
      'No API keys configured. Add GEMINI_API_KEY or GROQ_API_KEY to your .env file.\n' +
      'Get free keys at:\n' +
      '  • Gemini: https://aistudio.google.com/app/apikey\n' +
      '  • Groq: https://console.groq.com\n' +
      '  • OpenRouter: https://openrouter.ai/keys'
    );
  }

  let lastError;
  for (const provider of providers) {
    try {
      if (onProgress) onProgress(`\n⚡ Using **${provider.name}** engine...\n`);
      const result = await provider.fn(prompt, systemPrompt, responseSchema);
      if (onProgress) onProgress(`✅ **${provider.name}** responded successfully.\n\n`);
      return { result, provider: provider.name };
    } catch (err) {
      console.warn(`[VibeCoding] ${provider.name} failed:`, err.message);
      if (onProgress) onProgress(`⚠️ ${provider.name} unavailable, trying next...\n`);
      lastError = err;
    }
  }

  throw lastError || new Error('All LLM providers failed');
}

// ─── File Writer: Write generated files to disk ────────────────────────────
function writeFilesToDisk(files, projectRoot) {
  const written = [];
  for (const file of files) {
    try {
      const safePath = path.join(projectRoot, file.path).replace(/\\/g, '/');
      // Security: Ensure file is within project root
      if (!safePath.startsWith(projectRoot.replace(/\\/g, '/'))) {
        console.warn(`[VibeCoding] Blocked path traversal: ${file.path}`);
        continue;
      }
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, file.content, 'utf8');
      written.push({ path: file.path, size: Buffer.byteLength(file.content, 'utf8') });
    } catch (err) {
      console.error(`[VibeCoding] Failed to write ${file.path}:`, err.message);
    }
  }
  return written;
}

// ─── Build Enhanced Prompt with Project Context ────────────────────────────
function buildUserPrompt(userRequest, projectRoot, existingFiles = []) {
  let existingFileList = '';
  if (existingFiles.length > 0) {
    existingFileList = `\n\nHere are the existing files in the project. If you need to edit or modify them, return their complete updated content in the files array under their correct relative path. Do NOT overwrite unrelated code:\n`;
    for (const f of existingFiles) {
      existingFileList += `\n--- File: ${f.file_name} ---\n${f.file_content || ''}\n`;
    }
  }

  return `Create/Modify this application: ${userRequest}
${existingFileList}

Project root: ${projectRoot}

Remember:
- Generate COMPLETE, working file contents (not snippets or stubs).
- Make it visually stunning with modern design, responsive layout, CSS variables, and Lucide icons.
- It must work immediately when opened in a browser or run with Node.js.
- Include ALL files needed (HTML, CSS, JS, config, README).
- Use relative paths between files.`;
}

// ─── Main Vibe Coding Function ─────────────────────────────────────────────
async function vibeCode(userRequest, projectRoot, existingFiles = [], onProgress, db, projectId) {
  if (!onProgress) onProgress = () => {};

  onProgress(`# 🚀 Kiri Vibe Coding Engine\n\n`);
  onProgress(`**Request:** ${userRequest}\n\n`);
  onProgress(`---\n\n`);

  onProgress(`🔍 Reading project workspace and file contents...\n\n`);
  const userPrompt = buildUserPrompt(userRequest, projectRoot, existingFiles);

  // ── Step 1: Call LLM ──────────────────────────────────────────────────
  onProgress(`## 🧠 Analyzing request and generating codebase...\n\n`);
  const { result, provider } = await callLLM(userPrompt, VIBE_SYSTEM_PROMPT, onProgress, VIBE_OUTPUT_SCHEMA);

  // Validate result structure
  if (!result.files || !Array.isArray(result.files)) {
    throw new Error('LLM returned invalid response structure (missing files array)');
  }

  onProgress(`## 📋 Plan\n\n${result.plan || 'Building your application...'}\n\n`);
  onProgress(`**Stack:** ${result.stack || 'HTML/CSS/JavaScript'}\n\n`);
  onProgress(`---\n\n`);

  // ── Step 2: Stream file list ───────────────────────────────────────────
  onProgress(`## 📁 Generating ${result.files.length} file(s)...\n\n`);
  for (const file of result.files) {
    onProgress(`- **\`${file.path}\`** — ${file.description || 'Generated file'}\n`);
  }
  onProgress(`\n`);

  // ── Step 3: Write files to disk ────────────────────────────────────────
  onProgress(`## 💾 Writing files to project workspace...\n\n`);
  const written = writeFilesToDisk(result.files, projectRoot);

  // ── Step 4: Sync to database ───────────────────────────────────────────
  const updatedDbFiles = [];
  if (db && projectId) {
    const { v4: uuidv4 } = require('uuid');
    for (const file of result.files) {
      try {
        const existing = db.prepare('SELECT file_id FROM files WHERE project_id = ? AND file_name = ?')
          .get(projectId, file.path);

        if (existing) {
          db.prepare('UPDATE files SET file_content = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?')
            .run(file.content, existing.file_id);
          updatedDbFiles.push({
            file_id: existing.file_id,
            file_name: file.path,
            file_content: file.content
          });
        } else {
          const newId = uuidv4();
          db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
            .run(newId, projectId, file.path, file.content, file.path.split('.').pop() || 'text');
          updatedDbFiles.push({
            file_id: newId,
            file_name: file.path,
            file_content: file.content
          });
        }
        onProgress(`✅ Saved \`${file.path}\` to database (${(Buffer.byteLength(file.content) / 1024).toFixed(1)} KB)\n`);
      } catch (err) {
        console.error(`[VibeCoding] DB sync failed for ${file.path}:`, err.message);
        onProgress(`⚠️ \`${file.path}\` disk-only (DB error: ${err.message})\n`);
      }
    }
  }

  onProgress(`\n---\n\n`);

  // ── Step 5: Summary ───────────────────────────────────────────────────
  onProgress(`## ✨ Done!\n\n`);
  onProgress(`${result.summary || 'Your application has been generated successfully!'}\n\n`);

  if (result.preview) {
    const projectName = path.basename(projectRoot);
    const previewUrl = `/preview/${projectName}/${result.preview}`;
    onProgress(`### 🌐 Live Preview\n`);
    onProgress(`[Click to preview your app](${previewUrl})\n\n`);
  }

  if (result.commands && result.commands.length > 0) {
    onProgress(`### 🔧 Setup Commands\n`);
    result.commands.forEach(cmd => onProgress(`\`\`\`bash\n${cmd}\n\`\`\`\n`));
    onProgress(`\n`);
  }

  onProgress(`*Generated by Kiri using **${provider}***\n`);

  return {
    files: updatedDbFiles,
    result,
    provider,
    previewFile: result.preview || null
  };
}

// ─── Quick mode: Edit/enhance existing files ───────────────────────────────
async function vibeEdit(userRequest, filePath, fileContent, projectRoot, onProgress, db, projectId, existingFiles = []) {
  if (!onProgress) onProgress = () => {};

  const editSystemPrompt = `You are KIRI, an expert coding AI. Your job is to edit existing code based on user requests.

Always respond with valid JSON in this format:
{
  "explanation": "What you changed and why",
  "files": [
    {
      "path": "relative/file/path.ext",
      "content": "COMPLETE updated file content"
    }
  ],
  "summary": "Brief summary of changes"
}

Rules:
- Write COMPLETE file contents, never truncated.
- Maintain existing code style and structure.
- Only change what was requested, but do not break surrounding functionality.
- Make improvements look professional and clean.`;

  let contextFilesSection = '';
  const filteredFiles = existingFiles.filter(f => f.file_name !== filePath);
  
  if (filteredFiles.length > 0) {
    contextFilesSection = `\n\nOther files in the project for context:\n`;
    for (const f of filteredFiles) {
      contextFilesSection += `\n--- File: ${f.file_name} ---\n${f.file_content || ''}\n`;
    }
  }

  const editPrompt = `Target File to Edit: ${filePath}

Current Target File Content:
\`\`\`
${fileContent}
\`\`\`
${contextFilesSection}

User Request: ${userRequest}

Provide the complete updated file contents. If changes are needed in other files, you may also include their updated contents in the files array under their respective paths.`;

  onProgress(`## ✏️ Editing \`${filePath}\`...\n\n`);

  const { result, provider } = await callLLM(editPrompt, editSystemPrompt, onProgress, EDIT_OUTPUT_SCHEMA);

  const updatedDbFiles = [];
  if (result.files && db && projectId) {
    const { v4: uuidv4 } = require('uuid');
    for (const file of result.files) {
      try {
        const safePath = path.join(projectRoot, file.path);
        fs.mkdirSync(path.dirname(safePath), { recursive: true });
        fs.writeFileSync(safePath, file.content, 'utf8');

        const existing = db.prepare('SELECT file_id FROM files WHERE project_id = ? AND file_name = ?')
          .get(projectId, file.path);
        if (existing) {
          db.prepare('UPDATE files SET file_content = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?')
            .run(file.content, existing.file_id);
          updatedDbFiles.push({ file_id: existing.file_id, file_name: file.path, file_content: file.content });
        } else {
          const newId = uuidv4();
          db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
            .run(newId, projectId, file.path, file.content, file.path.split('.').pop() || 'text');
          updatedDbFiles.push({ file_id: newId, file_name: file.path, file_content: file.content });
        }
        onProgress(`✅ Saved \`${file.path}\` changes\n`);
      } catch (err) {
        console.error(`[VibeEdit] Failed to sync ${file.path}:`, err.message);
      }
    }
  }

  onProgress(`\n${result.explanation || result.summary || 'Edit complete!'}\n`);
  onProgress(`\n*Edited by Kiri using **${provider}***\n`);

  return { files: updatedDbFiles, result, provider };
}

module.exports = { vibeCode, vibeEdit };
