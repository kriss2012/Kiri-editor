const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  db.prepare('INSERT INTO users (user_id, name, email, password) VALUES (?, ?, ?, ?)')
    .run(userId, name, email, hashedPassword);

  const token = jwt.sign({ userId, name, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { userId, name, email } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.user_id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { userId: user.user_id, name: user.name, email: user.email } });
});

module.exports = router;
