# API Endpoints

## Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create new user account |
| POST | `/login` | No | Login and receive JWT token |
| POST | `/logout` | Yes | Invalidate session |
| GET | `/me` | Yes | Get current user profile |

## Projects

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/createProject` | Yes | Create a new project |
| GET | `/projects` | Yes | List all projects for user |
| GET | `/projects/:id` | Yes | Get project details |
| DELETE | `/projects/:id` | Yes | Delete a project |

## Files

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/saveFile` | Yes | Create or update a file |
| GET | `/getFiles/:project_id` | Yes | List files in a project |
| GET | `/files/:file_id` | Yes | Get file content |
| DELETE | `/files/:file_id` | Yes | Delete a file |
| GET | `/projectHistory/:file_id` | Yes | Get version history |

## Agent Tasks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/runAgent` | Yes | Submit a new agent task |
| GET | `/agentStatus/:task_id` | Yes | Get task status |
| GET | `/agentResult/:task_id` | Yes | Get task result |

## Sync

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/sync` | Yes | Manual sync trigger |
| WS | `/ws/project/:project_id` | Yes | WebSocket connection for real-time sync |

## Request/Response Examples

### POST /runAgent

**Request:**
```json
{
  "agent_type": "documentation",
  "project_id": 55,
  "file_id": 22,
  "input_data": "Generate documentation for utils.py"
}
```

**Response:**
```json
{
  "task_id": 101,
  "status": "pending",
  "created_at": "2026-03-31T08:00:00Z"
}
```
