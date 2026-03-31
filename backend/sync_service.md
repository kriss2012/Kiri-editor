# Sync Service

## Overview

Ensures all connected clients (users and agents) see the same project data in real-time using WebSockets.

## Technology

- **WebSockets** (socket.io / native WS)
- **CRDT** (Conflict-free Replicated Data Types) for concurrent edits
- **Operational Transform (OT)** for character-level change merging

## Sync Flow

```
User edits file
      |
Editor Service (saves to DB)
      |
Database
      |
Sync Service
      |
WebSocket Server
      |
All Connected Clients + Agents
```

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `file:update` | Server → Client | Broadcast file changes |
| `agent:result` | Server → Client | Agent task completed |
| `user:join` | Client → Server | User connects to project room |
| `user:leave` | Client → Server | User disconnects |
| `cursor:move` | Client → Server | Broadcast cursor position |

## Rooms

Each project gets its own WebSocket room:

```
room: project_<project_id>
```

All users and agents on the same project join this room.

## Guarantees

- At-most-once delivery for cursor positions (lossy OK)
- At-least-once delivery for file changes (critical)
- Idempotent apply for CRDT operations
