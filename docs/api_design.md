# API Design

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/createProject` | Create a new project |
| POST | `/saveFile` | Save or update a file |
| POST | `/runAgent` | Submit an agent task |
| GET | `/getFiles/:project_id` | List project files |
| GET | `/getAgentResult/:task_id` | Get agent task result |
| POST | `/login` | User login |
| POST | `/register` | User registration |
| POST | `/sync` | Trigger sync |
| GET | `/projectHistory/:file_id` | File version history |
| WS | `/ws/project/:project_id` | Real-time WebSocket connection |

## Design Principles

- **RESTful** for all CRUD operations
- **WebSockets** for real-time sync and agent notifications
- **JWT Bearer tokens** for authentication (`Authorization: Bearer <token>`)
- **JSON** request/response body
- **HTTP status codes**: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error
