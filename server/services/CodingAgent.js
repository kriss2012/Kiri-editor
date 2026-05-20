const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AGENT_TOOLS = [
  {
    name: "create_file",
    description: "Create a new file with content",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to project root" },
        content: { type: "string", description: "Full file content" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "edit_file",
    description: "Edit specific lines or sections in an existing file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        old_content: { type: "string", description: "Exact string to find and replace" },
        new_content: { type: "string", description: "Replacement string" }
      },
      required: ["path", "old_content", "new_content"]
    }
  },
  {
    name: "delete_file",
    description: "Delete a file or directory",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_file",
    description: "Read contents of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "run_command",
    description: "Run a shell command in the project directory",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string" },
        reason: { type: "string" }
      },
      required: ["command"]
    }
  },
  {
    name: "list_directory",
    description: "List files and folders in a directory",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" }
      }
    }
  },
  {
    name: "move_file",
    description: "Move or rename a file",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string" },
        destination: { type: "string" }
      },
      required: ["source", "destination"]
    }
  },
  {
    name: "search_in_files",
    description: "Search for a string across all project files",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        file_pattern: { type: "string", description: "e.g. *.js, *.tsx" }
      },
      required: ["query"]
    }
  }
];

class CodingAgent {
  constructor(projectRoot, onChunk) {
    this.projectRoot = projectRoot;
    this.conversationHistory = [];
    this.maxIterations = 20;
    this.onChunk = onChunk; // For streaming updates to frontend
    
    // Determine API Key
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  resolvePath(filePath) {
    return path.join(this.projectRoot, filePath);
  }
  
  getProjectTree() {
    try {
      const res = this.listDirectory({ path: '.' });
      return JSON.stringify(res.tree, null, 2);
    } catch {
      return "Empty project or unable to read directory.";
    }
  }

  log(msg) {
    console.log(`🤖 [Agent] ${msg}`);
    if (this.onChunk) this.onChunk(`\n> **System:** ${msg}\n`, 'chunk');
  }

  async run(userTask) {
    if (!this.client) {
      const err = 'ANTHROPIC_API_KEY not found in .env';
      this.log(err);
      throw new Error(err);
    }

    this.log(`Starting task: ${userTask}`);

    this.conversationHistory.push({
      role: 'user',
      content: userTask
    });

    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;
      this.log(`--- Iteration ${iteration} ---`);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620', // Use active 3.5 Sonnet
        max_tokens: 8096,
        system: this.buildSystemPrompt(),
        tools: AGENT_TOOLS,
        messages: this.conversationHistory
      });

      this.conversationHistory.push({
        role: 'assistant',
        content: response.content
      });

      if (response.stop_reason === 'end_turn') {
        const finalMessage = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
        
        this.log(`✅ Task complete.`);
        if (this.onChunk) this.onChunk(finalMessage, 'chunk');
        return finalMessage;
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            this.log(`🔧 Tool call: ${block.name}`);
            if (this.onChunk) {
               this.onChunk(`\n\`\`\`json\n// Calling ${block.name}\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n`, 'chunk');
            }

            const result = await this.executeTool(block.name, block.input);

            this.log(`📤 Result: ${result.success ? '✅' : '❌'}`);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          }
        }

        this.conversationHistory.push({
          role: 'user',
          content: toolResults
        });
      }
    }

    throw new Error('Max iterations reached');
  }

  buildSystemPrompt() {
    const tree = this.getProjectTree();
    return \`You are an expert coding agent. You have tools to create, edit, delete, 
and manage files in the project at: \${this.projectRoot}

Current project structure:
\${tree}

Rules:
- Always read a file before editing it
- Use edit_file for small changes, create_file to overwrite completely
- Run commands to install dependencies when needed
- Verify your changes work by reading files back
- Break complex tasks into small tool call steps\`;
  }

  async executeTool(toolName, input) {
    try {
      switch (toolName) {
        case 'create_file':    return this.createFile(input);
        case 'edit_file':      return this.editFile(input);
        case 'delete_file':    return this.deleteFile(input);
        case 'read_file':      return this.readFile(input);
        case 'run_command':    return this.runCommand(input);
        case 'list_directory': return this.listDirectory(input);
        case 'move_file':      return this.moveFile(input);
        case 'search_in_files':return this.searchInFiles(input);
        default:
          return { success: false, message: \`Unknown tool: \${toolName}\` };
      }
    } catch (err) {
      return { success: false, message: err.message, error: true };
    }
  }

  createFile({ path: filePath, content }) {
    const fullPath = this.resolvePath(filePath);
    if (!fullPath.startsWith(this.projectRoot)) {
      return { success: false, message: 'Path outside project root blocked' };
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const existed = fs.existsSync(fullPath);
    fs.writeFileSync(fullPath, content, 'utf8');
    return {
      success: true,
      message: existed ? \`File overwritten: \${filePath}\` : \`File created: \${filePath}\`,
      path: filePath,
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  editFile({ path: filePath, old_content, new_content }) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) return { success: false, message: \`File not found: \${filePath}\` };
    const current = fs.readFileSync(fullPath, 'utf8');
    if (!current.includes(old_content)) {
      return { success: false, message: 'String not found in file.' };
    }
    const updated = current.replace(old_content, new_content);
    fs.writeFileSync(fullPath, updated, 'utf8');
    return { success: true, message: \`Edited \${filePath}\` };
  }

  deleteFile({ path: filePath }) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) return { success: false, message: \`Not found: \${filePath}\` };
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      return { success: true, message: \`Directory deleted: \${filePath}\` };
    } else {
      fs.unlinkSync(fullPath);
      return { success: true, message: \`File deleted: \${filePath}\` };
    }
  }

  readFile({ path: filePath }) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) return { success: false, message: \`File not found: \${filePath}\` };
    const content = fs.readFileSync(fullPath, 'utf8');
    return { success: true, content, path: filePath };
  }

  runCommand({ command, reason }) {
    const blocked = ['rm -rf /', 'format', 'mkfs', 'dd if=', '> /dev/'];
    if (blocked.some(b => command.includes(b))) return { success: false, message: 'Blocked dangerous command' };
    try {
      const output = execSync(command, { cwd: this.projectRoot, timeout: 30000 }).toString();
      return { success: true, output: output.slice(0, 2000), command };
    } catch (err) {
      return { success: false, message: err.message, stderr: err.stderr?.toString().slice(0, 1000) };
    }
  }

  moveFile({ source, destination }) {
    const srcPath = this.resolvePath(source);
    const dstPath = this.resolvePath(destination);
    if (!fs.existsSync(srcPath)) return { success: false, message: \`Source not found: \${source}\` };
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.renameSync(srcPath, dstPath);
    return { success: true, message: \`Moved \${source} → \${destination}\` };
  }

  searchInFiles({ query, file_pattern }) {
    return { success: true, message: "search functionality mock executed" };
  }

  listDirectory({ path: dirPath = '.' }) {
    const fullPath = this.resolvePath(dirPath);
    const walk = (dir, depth = 0, maxDepth = 2) => {
      if (depth > maxDepth || !fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const result = [];
      for (const entry of entries) {
        if (['node_modules', '.git', '.next', 'dist'].includes(entry.name)) continue;
        const rel = path.relative(this.projectRoot, path.join(dir, entry.name));
        result.push({ path: rel, type: entry.isDirectory() ? 'directory' : 'file' });
        if (entry.isDirectory()) result.push(...walk(path.join(dir, entry.name), depth + 1, maxDepth));
      }
      return result;
    };
    return { success: true, tree: walk(fullPath) };
  }
}

module.exports = { CodingAgent };
