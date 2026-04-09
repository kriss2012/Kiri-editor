require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const redis = require('redis');
const { authMiddleware } = require('./middleware/auth');

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Editor Service', timestamp: new Date().toISOString() });
});

// ─── Projects ──────────────────────────────────────────────────────────────

// GET /api/projects — list user projects
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects — create project
app.post('/api/projects', authMiddleware, async (req, res) => {
  const { projectName, description } = req.body;
  if (!projectName) return res.status(400).json({ error: 'Project name required' });

  try {
    const result = await db.query(
      'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3) RETURNING project_id',
      [req.user.userId, projectName, description || '']
    );
    const projectId = result.rows[0].project_id;

    // Create default files
    const defaultFiles = [
      { name: 'main.js', content: '// Welcome to Kiri Editor!\nfunction main() {\n  console.log("Hello, World!");\n}\nmain();\n', lang: 'javascript' },
      { name: 'README.md', content: `# ${projectName}\n\nCreated with **Kiri Editor**.\n`, lang: 'markdown' },
    ];

    for (const f of defaultFiles) {
      await db.query(
        'INSERT INTO files (project_id, file_name, file_content, language) VALUES ($1, $2, $3, $4)',
        [projectId, f.name, f.content, f.lang]
      );
    }

    res.status(201).json({ projectId, projectName, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id — get project details
app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const projectRes = await db.query('SELECT * FROM projects WHERE project_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    // Try to get files from cache
    const cacheKey = `project:${req.params.id}:files`;
    const cachedFiles = await redisClient.get(cacheKey);

    let files;
    if (cachedFiles) {
      files = JSON.parse(cachedFiles);
      console.log(`Cache HIT for project ${req.params.id}`);
    } else {
      const filesRes = await db.query('SELECT * FROM files WHERE project_id = $1 ORDER BY file_name', [req.params.id]);
      files = filesRes.rows;
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(files)); // Cache for 1 hour
      console.log(`Cache MISS for project ${req.params.id}`);
    }

    res.json({ ...projectRes.rows[0], files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE project_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Files ─────────────────────────────────────────────────────────────────

// POST /api/files — create file
app.post('/api/files', authMiddleware, async (req, res) => {
  const { projectId, fileName, fileContent, language } = req.body;
  if (!projectId || !fileName) return res.status(400).json({ error: 'projectId and fileName required' });

  try {
    const result = await db.query(
      'INSERT INTO files (project_id, file_name, file_content, language) VALUES ($1, $2, $3, $4) RETURNING file_id',
      [projectId, fileName, fileContent || '', language || 'javascript']
    );

    // Invalidate cache
    await redisClient.del(`project:${projectId}:files`);

    res.status(201).json({ fileId: result.rows[0].file_id, projectId, fileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/files/:id — update file
app.put('/api/files/:id', authMiddleware, async (req, res) => {
  const { fileContent, language } = req.body;
  try {
    const current = await db.query('SELECT file_content, project_id FROM files WHERE file_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'File not found' });

    // Snapshot version
    await db.query('INSERT INTO versions (file_id, content, created_by) VALUES ($1, $2, $3)', [req.params.id, current.rows[0].file_content, req.user.userId]);

    await db.query(
      'UPDATE files SET file_content = COALESCE($1, file_content), language = COALESCE($2, language), updated_at = NOW() WHERE file_id = $3',
      [fileContent, language, req.params.id]
    );

    // Invalidate cache
    await redisClient.del(`project:${current.rows[0].project_id}:files`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/:id/versions — list file versions
app.get('/api/files/:id/versions', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT v.*, u.name as creator_name FROM versions v LEFT JOIN users u ON v.created_by = u.user_id WHERE v.file_id = $1 ORDER BY v.created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/:id
app.delete('/api/files/:id', authMiddleware, async (req, res) => {
  try {
    const current = await db.query('SELECT project_id FROM files WHERE file_id = $1', [req.params.id]);
    await db.query('DELETE FROM files WHERE file_id = $1', [req.params.id]);

    if (current.rows.length > 0) {
      await redisClient.del(`project:${current.rows[0].project_id}:files`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📂 Editor Service running on port ${PORT}`);
});
