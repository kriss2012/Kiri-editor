const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { runAgent, agents } = require('../services/agentWorker');

const router = express.Router();

// GET /api/agents — list available agents
router.get('/', (req, res) => {
  const agentList = Object.entries(agents).map(([type, agent]) => ({
    type,
    name: agent.name,
    icon: agent.icon,
    color: agent.color
  }));
  res.json(agentList);
});

// POST /api/agents/run — trigger agent task (SSE streaming)
router.post('/run', authMiddleware, async (req, res) => {
  const { agentType, fileId, projectId, inputData } = req.body;
  if (!agentType) return res.status(400).json({ error: 'agentType required' });

  const taskId = uuidv4();
  const fileName = fileId
    ? (db.prepare('SELECT file_name FROM files WHERE file_id = ?').get(fileId) || {}).file_name || 'untitled.js'
    : 'untitled.js';

  const input = inputData || (fileId
    ? (db.prepare('SELECT file_content FROM files WHERE file_id = ?').get(fileId) || {}).file_content || ''
    : '');

  // Store task as pending
  db.prepare('INSERT INTO agent_tasks (task_id, project_id, file_id, agent_type, input_data, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(taskId, projectId || null, fileId || null, agentType, input.slice(0, 5000), 'running');

  // Set up SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Task-ID', taskId);

  // Send task ID immediately
  res.write(`data: ${JSON.stringify({ type: 'start', taskId, agentType })}\n\n`);

  try {
    let fullResult = '';

    await runAgent(agentType, input, fileName, (chunk) => {
      fullResult += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });

    // Update DB with result
    db.prepare('UPDATE agent_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?')
      .run('completed', fullResult, taskId);

    res.write(`data: ${JSON.stringify({ type: 'done', taskId })}\n\n`);
    res.end();
  } catch (err) {
    db.prepare('UPDATE agent_tasks SET status = ? WHERE task_id = ?').run('failed', taskId);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/agents/status/:taskId
router.get('/status/:taskId', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks WHERE task_id = ?')
    .get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// GET /api/agents/result/:taskId
router.get('/result/:taskId', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM agent_tasks WHERE task_id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// GET /api/agents/history — recent tasks
router.get('/history', authMiddleware, (req, res) => {
  const tasks = db.prepare(
    'SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks ORDER BY created_at DESC LIMIT 50'
  ).all();
  res.json(tasks);
});

module.exports = router;
