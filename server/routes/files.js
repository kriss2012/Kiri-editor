const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/files/:id — get single file
router.get('/:id', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE file_id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

// POST /api/files — create new file in project
router.post('/', authMiddleware, (req, res) => {
  const { projectId, fileName, fileContent, language } = req.body;
  if (!projectId || !fileName) return res.status(400).json({ error: 'projectId and fileName required' });

  const fileId = uuidv4();
  db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
    .run(fileId, projectId, fileName, fileContent || '', language || 'javascript');

  res.status(201).json({ fileId, projectId, fileName, fileContent: fileContent || '', language: language || 'javascript' });
});

// PUT /api/files/:id — save/update file content
router.put('/:id', authMiddleware, (req, res) => {
  const { fileContent, language } = req.body;
  const file = db.prepare('SELECT * FROM files WHERE file_id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  // Save a version snapshot
  db.prepare('INSERT INTO versions (version_id, file_id, content) VALUES (?, ?, ?)')
    .run(uuidv4(), req.params.id, file.file_content);

  db.prepare('UPDATE files SET file_content = ?, language = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?')
    .run(fileContent ?? file.file_content, language ?? file.language, req.params.id);

  res.json({ success: true });
});

// DELETE /api/files/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM versions WHERE file_id = ?').run(req.params.id);
  db.prepare('DELETE FROM files WHERE file_id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/files/:id/versions — get version history
router.get('/:id/versions', authMiddleware, (req, res) => {
  const versions = db.prepare('SELECT version_id, created_at FROM versions WHERE file_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.params.id);
  res.json(versions);
});

module.exports = router;
