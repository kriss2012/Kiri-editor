const express = require('express');
const { exec } = require('child_process');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/terminal/run — run local console commands
router.post('/run', authMiddleware, (req, res) => {
  const { command, cwd, projectId } = req.body;
  if (!command) return res.status(400).json({ error: 'No command specified' });

  let runDir = cwd || process.cwd();

  if (projectId) {
     const db = require('../db/database');
     const path = require('path');
     const project = db.prepare('SELECT * FROM projects WHERE project_id = ? AND user_id = ?').get(projectId, req.user.userId);
     if (project) {
        runDir = project.custom_path || path.join(db.workspace, project.project_name);
     }
  }

  // Execute natively on the user's local workspace
  exec(command, { cwd: runDir, timeout: 10000 }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: error ? error.code : 0,
      error: error ? error.message : null
    });
  });
});

module.exports = router;
