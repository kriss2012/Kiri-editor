const express = require('express');
const { exec } = require('child_process');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/terminal/run — run local console commands
router.post('/run', authMiddleware, (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'No command specified' });

  // Execute natively on the user's local workspace
  const runDir = cwd || process.cwd();

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
