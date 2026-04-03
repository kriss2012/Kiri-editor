require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict to frontend domain
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3004;

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Sync Service', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[Sync] Client connected: ${socket.id}`);

  // Join a project room for collaborative sync
  socket.on('join-project', (projectId) => {
    socket.join(`project:${projectId}`);
    socket.to(`project:${projectId}`).emit('user-joined', { socketId: socket.id });
    console.log(`[Sync] ${socket.id} joined project:${projectId}`);
  });

  // File edit sync — broadcast to all other users in the same project
  socket.on('file-edit', ({ projectId, fileId, content, cursorPos }) => {
    socket.to(`project:${projectId}`).emit('file-updated', { fileId, content, cursorPos, from: socket.id });
  });

  // Agent notifications (bridging service status to frontend)
  socket.on('agent-started', ({ projectId, agentType, taskId }) => {
    io.to(`project:${projectId}`).emit('agent-running', { agentType, taskId, timestamp: Date.now() });
  });

  socket.on('agent-done', ({ projectId, taskId }) => {
    io.to(`project:${projectId}`).emit('agent-completed', { taskId, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`[Sync] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`📡 Sync Service (WebSockets) running on port ${PORT}`);
});
