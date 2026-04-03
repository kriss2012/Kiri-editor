require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { runAgent } = require('./worker');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'kiri_secret_key_2026';

app.use(cors());
app.use(express.json());

// Auth Middleware (simplified for microservice internal use or direct client)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Agent Manager', timestamp: new Date().toISOString() });
});

// POST /run — Execute an agent task (SSE streaming)
app.post('/run', authMiddleware, async (req, res) => {
  const { agentType, fileId, projectId, inputData } = req.body;
  if (!agentType || !fileId || !projectId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Create task entry in DB
  let taskId;
  try {
    const result = await db.query(
      'INSERT INTO agent_tasks (project_id, file_id, agent_type, status, input_data) VALUES ($1, $2, $3, $4, $5) RETURNING task_id',
      [projectId, fileId, agentType, 'running', inputData || '']
    );
    taskId = result.rows[0].task_id;
  } catch (err) {
    console.error('[Agent Manager] DB Error:', err.message);
    return res.status(500).json({ error: 'Could not create task' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const resultText = await runAgent(agentType, inputData, 'file', (chunk) => {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk, taskId })}\n\n`);
    });

    // Update task as completed in DB
    await db.query(
      'UPDATE agent_tasks SET status = $1, result = $2, completed_at = NOW() WHERE task_id = $3',
      ['completed', resultText, taskId]
    );

    res.write(`data: ${JSON.stringify({ type: 'done', taskId })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Agent Manager] Agent Error:', err.message);
    await db.query('UPDATE agent_tasks SET status = $1, result = $2 WHERE task_id = $3', ['error', err.message, taskId]);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message, taskId })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Agent Manager running on port ${PORT}`);
});
