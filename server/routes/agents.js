const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { vibeCode, vibeEdit } = require('../services/VibeCodingEngine');
const { runAgent, agents } = require('../services/agentWorker');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// GET /api/agents — list available agent types
router.get('/', (req, res) => {
  const agentList = Object.entries(agents).map(([type, agent]) => ({
    type,
    name: agent.name,
    icon: agent.icon,
    color: agent.color
  }));
  res.json(agentList);
});

/**
 * POST /api/agents/run — The main agent endpoint
 *
 * Two modes:
 *   mode: 'vibe'  — Full project generation from one prompt (Bolt.new style)
 *   mode: 'edit'  — Edit/improve a specific file (legacy behavior)
 *
 * Body params:
 *   mode        : 'vibe' | 'edit' (default: 'edit')
 *   prompt      : User's natural language request
 *   projectId   : Project ID
 *   fileId      : (edit mode) file to edit
 *   agentType   : (edit mode) which agent specialization
 *   inputData   : (edit mode) current file content
 */
router.post('/run', authMiddleware, async (req, res) => {
  const { mode = 'edit', agentType, fileId, projectId, inputData, prompt } = req.body;

  if (!prompt && !inputData) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const taskId = uuidv4();

  // ── SSE Setup ────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Task-ID', taskId);
  res.write(`data: ${JSON.stringify({ type: 'start', taskId, mode })}\n\n`);

  // ── Store task as running ────────────────────────────────────────────────
  try {
    db.prepare(
      'INSERT INTO agent_tasks (task_id, project_id, file_id, agent_type, input_data, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(taskId, projectId || null, fileId || null, agentType || mode, (prompt || '').slice(0, 5000), 'running');
  } catch (err) {
    console.warn('[Agents] Failed to store task:', err.message);
  }

  // ── Streaming chunk sender ───────────────────────────────────────────────
  const onProgress = (chunk, type = 'chunk') => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, content: chunk })}\n\n`);
    }
  };

  let fullResult = '';
  const accumulatingProgress = (chunk) => {
    fullResult += chunk;
    onProgress(chunk, 'chunk');
  };

  try {
    // ════════════════════════════════════════════════════════════════════════
    // MODE: VIBE — Full app generation from one command
    // ════════════════════════════════════════════════════════════════════════
    if (mode === 'vibe') {
      if (!projectId) {
        onProgress('❌ Error: projectId is required for vibe mode\n');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'projectId required for vibe mode' })}\n\n`);
        return res.end();
      }

      // Get project info
      const proj = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(projectId);
      if (!proj) {
        onProgress('❌ Error: Project not found\n');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Project not found' })}\n\n`);
        return res.end();
      }

      const projDir = proj.custom_path || path.join(db.workspace, proj.project_name);
      fs.mkdirSync(projDir, { recursive: true });

      // Get existing files for context (with complete name and contents)
      const existingFiles = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(projectId);

      // Run the vibe coding engine
      const vibe = await vibeCode(
        prompt,
        projDir,
        existingFiles,
        accumulatingProgress,
        db,
        projectId
      );

      // Tell frontend to refresh all files
      if (vibe.files && vibe.files.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'files-updated', files: vibe.files })}\n\n`);
      }

      // Send preview URL if we have one
      if (vibe.previewFile) {
        const previewUrl = `/preview/${proj.project_name}/${vibe.previewFile}`;
        res.write(`data: ${JSON.stringify({ type: 'preview-ready', url: previewUrl })}\n\n`);
      }

      // Update task as completed
      db.prepare(
        'UPDATE agent_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?'
      ).run('completed', fullResult.slice(0, 10000), taskId);

      res.write(`data: ${JSON.stringify({ type: 'done', taskId })}\n\n`);
      return res.end();
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODE: EDIT — Edit a specific file (with Vibe Engine quality)
    // ════════════════════════════════════════════════════════════════════════
    if (mode === 'edit' && projectId && fileId) {
      const proj = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(projectId);
      const fileRecord = db.prepare('SELECT * FROM files WHERE file_id = ?').get(fileId);

      if (proj && fileRecord) {
        const projDir = proj.custom_path || path.join(db.workspace, proj.project_name);

        // Get existing files for project context (with name and contents)
        const existingFiles = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(projectId);

        const edit = await vibeEdit(
          prompt || `Review and improve ${fileRecord.file_name}`,
          fileRecord.file_name,
          inputData || fileRecord.file_content || '',
          projDir,
          accumulatingProgress,
          db,
          projectId,
          existingFiles
        );

        if (edit.files && edit.files.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'files-updated', files: edit.files })}\n\n`);
        }

        db.prepare(
          'UPDATE agent_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?'
        ).run('completed', fullResult.slice(0, 10000), taskId);

        res.write(`data: ${JSON.stringify({ type: 'done', taskId })}\n\n`);
        return res.end();
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // FALLBACK: Legacy single-shot agent (agentWorker.js)
    // ════════════════════════════════════════════════════════════════════════
    const fileName = fileId
      ? (db.prepare('SELECT file_name FROM files WHERE file_id = ?').get(fileId) || {}).file_name || 'untitled.js'
      : 'untitled.js';

    const input = inputData || (fileId
      ? (db.prepare('SELECT file_content FROM files WHERE file_id = ?').get(fileId) || {}).file_content || ''
      : '');

    const legacyResult = await runAgent(
      agentType || 'code',
      input,
      fileName,
      prompt,
      (chunk, type = 'chunk') => {
        if (type === 'chunk') fullResult += chunk;
        onProgress(chunk, type);
      }
    );

    // Process file updates from legacy agent
    if (legacyResult.files?.length > 0 && projectId) {
      const updatedFiles = [];
      for (const f of legacyResult.files) {
        const existing = db.prepare('SELECT file_id FROM files WHERE project_id = ? AND file_name = ?')
          .get(projectId, f.path);
        let fId = existing ? existing.file_id : uuidv4();
        if (existing) {
          db.prepare('UPDATE files SET file_content = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?')
            .run(f.content, fId);
        } else {
          db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content) VALUES (?, ?, ?, ?)')
            .run(fId, projectId, f.path, f.content);
        }
        updatedFiles.push({ file_id: fId, file_name: f.path, file_content: f.content });
      }
      res.write(`data: ${JSON.stringify({ type: 'files-updated', files: updatedFiles })}\n\n`);
    }

    db.prepare(
      'UPDATE agent_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?'
    ).run('completed', fullResult.slice(0, 10000), taskId);

    res.write(`data: ${JSON.stringify({ type: 'done', taskId })}\n\n`);
    res.end();

  } catch (err) {
    console.error('[Agents] Run error:', err);
    try {
      db.prepare('UPDATE agent_tasks SET status = ? WHERE task_id = ?').run('failed', taskId);
    } catch (_) {}
    onProgress(`\n\n❌ **Error:** ${err.message}\n`);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/agents/status/:taskId
router.get('/status/:taskId', authMiddleware, (req, res) => {
  const task = db.prepare(
    'SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks WHERE task_id = ?'
  ).get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// GET /api/agents/result/:taskId
router.get('/result/:taskId', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM agent_tasks WHERE task_id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// GET /api/agents/history
router.get('/history', authMiddleware, (req, res) => {
  const tasks = db.prepare(
    'SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks ORDER BY created_at DESC LIMIT 50'
  ).all();
  res.json(tasks);
});

module.exports = router;


