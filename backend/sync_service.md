# Sync Service (Phase 6: CRDT Transition)

## Overview

Ensures all connected clients (users and agents) see the same project data in real-time. In Phase 6, we transition from simple message broadcasts to a robust **CRDT (Conflict-free Replicated Data Type)** implementation using **Yjs** or **Automerge**.

## Technology

- **WebSockets**: Socket.io for transport.
- **CRDT Engine**: **Yjs** (chosen for performance and Monaco integration).
- **Persistence**: Redis for ephemeral state, PostgreSQL for long-term storage.

## CRDT Sync Flow (Phase 6)

Instead of sending the full file content on every edit, we send high-performance binary deltas.

```
User Edit (Monaco)
      |
Yjs Binding (Client)
      | (Binary Delta)
WebSocket
      |
Sync Service (Yjs Provider)
      | (Merge Delta)
Shared Doc State (Redis)
      | (Broadcast Delta)
All Other Clients + AI Agents
```

## WebSocket Events (Updated)

| Event | Direction | Description |
|---|---|---|
| `sync:update` | Bi-directional | Send/Receive Yjs binary update deltas |
| `sync:awareness` | Bi-directional | Propagate cursors and "Agent is typing" state |
| `agent:result` | Server → Client | Agent task completed; results pushed to Yjs doc |
| `project:join` | Client → Server | Connect to a specific Yjs shared document |

## Shared Document Structure

The system maintains a shared document per file:

- **Text Type**: The actual source code.
- **Map Type**: Metadata (lint errors, agent status).
- **Array Type**: Comments and annotations.

## Guarantees

- **Eventual Consistency**: All clients converge on the same state without a central coordinator.
- **Offline Support**: Edits made offline are merged automatically when reconnecting.
- **Agent Integration**: AI agents act as "headless clients" in the Yjs room, allowing them to see real-time edits as they happen.

## Implementation Note

The `Sync Service` now maintains a `Y.Doc` instance in-memory for active projects, periodically flushing the state to the `Editor Service` for persistent database storage.
