# Event-Driven Architecture

The system uses an Event-Driven Architecture (EDA) to decouple services and enable async processing.

## Events

| Event | Triggered By |
|---|---|
| `UserCreated` | Auth Service |
| `ProjectCreated` | Project Service |
| `FileUpdated` | Editor Service |
| `AgentTaskCreated` | Agent Manager |
| `AgentTaskCompleted` | Agent Worker |
| `VersionCreated` | Editor Service |
| `SyncUpdate` | Sync Service |

## Event Flow

```
User Action → Event → Message Queue → Consumer Service → Database → Sync → User
```

## Event Example

### FileUpdated Event

```json
{
  "event": "FileUpdated",
  "project_id": 12,
  "file_id": 55,
  "updated_by": "user_21",
  "timestamp": 1712345678
}
```

### AgentTaskCompleted Event

```json
{
  "event": "AgentTaskCompleted",
  "task_id": 101,
  "agent_type": "documentation",
  "project_id": 55,
  "file_id": 22,
  "result": "# Function: calculateSum\nThis function adds two numbers...",
  "completed_at": 1712345999
}
```

## Benefits

- **Loose coupling**: Services don't call each other directly
- **Scalability**: Events buffered in queue during traffic spikes
- **Reliability**: Events can be replayed on failure
- **Observability**: All events are logged for auditing
