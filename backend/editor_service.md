# Editor Service

## Overview

Manages the core code/text editing experience, including file I/O, real-time collaboration, and version history.

## Responsibilities

- Text and code editing (Monaco Editor backend)
- File creation, update, and deletion
- File versioning (snapshot on every save)
- Real-time collaborative editing (via Sync Service)

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/files/:project_id` | List all files in a project |
| GET | `/files/:file_id/content` | Get file content |
| POST | `/files` | Create a new file |
| PUT | `/files/:file_id` | Update file content (auto-versions) |
| DELETE | `/files/:file_id` | Delete a file |
| GET | `/files/:file_id/versions` | List version history |
| GET | `/files/:file_id/versions/:version_id` | Get a specific version |

## Versioning Strategy

Every save creates a new version entry:

```sql
INSERT INTO versions (file_id, content, created_at)
VALUES ($1, $2, NOW());
```

Versions retained: **last 50 versions** per file (older ones archived to S3).

## Real-Time Collaboration

- Uses **WebSocket** connections via Sync Service
- Conflict resolution via **Operational Transform (OT)**
- Each character change is broadcast as a delta operation
