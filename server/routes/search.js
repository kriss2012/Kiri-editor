const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/search — global search across projects/files in SQLite
router.get('/', authMiddleware, (req, res) => {
  const { q, projectId } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

  const searchPattern = `%${q.toLowerCase()}%`;
  try {
    let files;
    if (projectId) {
      // Search within a specific project
      files = db.prepare(`
        SELECT f.file_id, f.file_name, f.project_id, f.language, f.updated_at, f.file_content
        FROM files f
        JOIN projects p ON f.project_id = p.project_id
        WHERE p.user_id = ? AND f.project_id = ? AND lower(f.file_content) LIKE ?
        LIMIT 20
      `).all(req.user.userId, projectId, searchPattern);
    } else {
      // Search across all user projects
      files = db.prepare(`
        SELECT f.file_id, f.file_name, f.project_id, p.project_name, f.language, f.updated_at, f.file_content
        FROM files f
        JOIN projects p ON f.project_id = p.project_id
        WHERE p.user_id = ? AND lower(f.file_content) LIKE ?
        LIMIT 20
      `).all(req.user.userId, searchPattern);
    }

    const results = files.map(file => {
      const content = file.file_content || '';
      const lowerContent = content.toLowerCase();
      const pos = lowerContent.indexOf(q.toLowerCase());
      
      let start = Math.max(0, pos - 50);
      let end = Math.min(content.length, pos + q.length + 50);
      let snippet = content.substring(start, end).replace(/\n/g, ' ');
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';

      return {
        file_id: file.file_id,
        file_name: file.file_name,
        project_id: file.project_id,
        project_name: file.project_name || '',
        language: file.language,
        updated_at: file.updated_at,
        snippet: snippet
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
