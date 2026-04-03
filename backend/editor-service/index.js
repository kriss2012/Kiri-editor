require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { authMiddleware } = require('./middleware/auth');

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

    const filesRes = await db.query('SELECT * FROM files WHERE project_id = $1 ORDER BY file_name', [req.params.id]);
    res.json({ ...projectRes.rows[0], files: filesRes.rows });
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

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/:id
app.delete('/api/files/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM files WHERE file_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📂 Editor Service running on port ${PORT}`);
});
