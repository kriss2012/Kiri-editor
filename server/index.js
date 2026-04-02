require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const fileRoutes = require('./routes/files');
const agentRoutes = require('./routes/agents');

const app = express();
const server = http.createServer(app);

// Socket.io — real-time sync
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kiri Editor API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/agents', agentRoutes);

// ─── WebSocket Events ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join a project room for collaborative sync
  socket.on('join-project', (projectId) => {
    socket.join(`project:${projectId}`);
    socket.to(`project:${projectId}`).emit('user-joined', { socketId: socket.id });
    console.log(`[Socket] ${socket.id} joined project:${projectId}`);
  });

  // File edit sync — broadcast to all other users in the same project
  socket.on('file-edit', ({ projectId, fileId, content, cursorPos }) => {
    socket.to(`project:${projectId}`).emit('file-updated', { fileId, content, cursorPos, from: socket.id });
  });

  // Agent started notification
  socket.on('agent-started', ({ projectId, agentType, taskId }) => {
    io.to(`project:${projectId}`).emit('agent-running', { agentType, taskId, timestamp: Date.now() });
  });

  // Agent completed notification
  socket.on('agent-done', ({ projectId, taskId }) => {
    io.to(`project:${projectId}`).emit('agent-completed', { taskId, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Export io for use in routes if needed
app.set('io', io);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Kiri Editor Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔑 API endpoints: http://localhost:${PORT}/api\n`);
});

module.exports = { app, io };
