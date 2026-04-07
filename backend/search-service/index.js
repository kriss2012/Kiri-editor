require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'kiri_secret_key_2026';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    req.user = decoded;
    next();
  });
};

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Search Service' });
});

// GET /api/search — global search across projects/files
app.get('/api/search', authMiddleware, async (req, res) => {
  const { q, projectId } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

  try {
    let query, params;

    if (projectId) {
      // Search within a specific project
      query = `
        SELECT f.file_id, f.file_name, f.project_id, f.language, f.updated_at,
               substring(f.file_content from position($1 in lower(f.file_content)) - 50 for 100) as snippet
        FROM files f
        JOIN projects p ON f.project_id = p.project_id
        WHERE p.user_id = $2 AND f.project_id = $3 AND lower(f.file_content) LIKE $4
        LIMIT 20
      `;
      params = [q.toLowerCase(), req.user.userId, projectId, `%${q.toLowerCase()}%`];
    } else {
      // Search across all user projects
      query = `
        SELECT f.file_id, f.file_name, f.project_id, p.project_name, f.language, f.updated_at,
               substring(f.file_content from position($1 in lower(f.file_content)) - 50 for 100) as snippet
        FROM files f
        JOIN projects p ON f.project_id = p.project_id
        WHERE p.user_id = $2 AND lower(f.file_content) LIKE $3
        LIMIT 20
      `;
      params = [q.toLowerCase(), req.user.userId, `%${q.toLowerCase()}%`];
    }

    const result = await db.query(query, params);
    
    // Clean up snippets (handle potential nulls or start/end offsets)
    const results = result.rows.map(row => ({
      ...row,
      snippet: row.snippet ? `...${row.snippet.replace(/\n/g, ' ')}...` : ''
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔍 Search Service running on port ${PORT}`);
});
