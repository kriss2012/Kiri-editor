# Data Flow

## End-to-End Flow

1. User writes code in the editor
2. Editor Service saves the file to the database
3. Sync Service updates all connected collaborators
4. User requests an agent task (e.g., "Generate documentation")
5. Request goes to Agent Manager via API Gateway
6. Agent Manager creates a task record and pushes it to the Message Queue
7. Agent Worker picks the task from the queue
8. Agent processes the data using its AI model
9. Result is stored in the database (SQL + NoSQL)
10. Sync Service broadcasts the update to the editor via WebSocket

## Data Flow Diagram

```
User writes code
      |
Editor Service (saves file)
      |
Database (SQL)
      |
Sync Service
      |
WebSocket Server
      |
All Connected Clients + Agents
```

## Agent Task Flow

```
User Request → API Gateway → Agent Manager → Message Queue
                                                   |
                                            Agent Worker
                                                   |
                                           Processing Engine
                                                   |
                                            Database (result)
                                                   |
                                            Sync Service
                                                   |
                                            Editor (real-time update)
```

## File Update Event

```json
{
  "event": "FileUpdated",
  "project_id": 12,
  "file_id": 55,
  "updated_by": "user_21",
  "timestamp": 1712345678
}
```
