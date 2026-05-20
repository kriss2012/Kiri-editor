const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kiri-editor-super-secret-key-2024';

function authMiddleware(req, res, next) {
  // Offline desktop app - bypass authentication completely
  req.user = { userId: 'local', name: 'Local User', email: 'local@kirieditor.com' };
  next();
}

module.exports = { authMiddleware, JWT_SECRET };
