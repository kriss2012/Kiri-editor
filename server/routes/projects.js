const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/projects — create project
router.post('/', authMiddleware, (req, res) => {
  const { projectName, description } = req.body;
  if (!projectName) return res.status(400).json({ error: 'Project name required' });

  const projectId = uuidv4();
  db.prepare('INSERT INTO projects (project_id, user_id, project_name, description) VALUES (?, ?, ?, ?)')
    .run(projectId, req.user.userId, projectName, description || '');

  // Create default files
  const defaultFiles = [
    { name: 'main.js', content: '// Welcome to Kiri Editor!\n// Start coding here...\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n', lang: 'javascript' },
    { name: 'README.md', content: `# ${projectName}\n\nThis project was created with **Kiri Editor**.\n\n## Getting Started\n\nStart editing \`main.js\` and use the Agent Panel to get AI assistance.\n`, lang: 'markdown' },
  ];

  defaultFiles.forEach(f => {
    db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), projectId, f.name, f.content, f.lang);
  });

  res.status(201).json({ projectId, projectName, description });
});

// GET /api/projects — list user projects
router.get('/', authMiddleware, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
  res.json(projects);
});

// GET /api/projects/:id — get project with files
router.get('/:id', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE project_id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(req.params.id);
  res.json({ ...project, files });
});

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM files WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE project_id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  res.json({ success: true });
});

module.exports = router;
