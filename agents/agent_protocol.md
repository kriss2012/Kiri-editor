# Agent Communication Protocol

Agents communicate using the Message Queue (Kafka / RabbitMQ).

## Task Message Format

```json
{
  "task_id": 101,
  "agent_type": "documentation",
  "project_id": 55,
  "file_id": 22,
  "input_data": "Generate documentation for this file",
  "priority": 1,
  "created_at": "2026-03-31T08:00:00Z"
}
```

## Agent Response Format

```json
{
  "task_id": 101,
  "status": "completed",
  "result": "# Function: calculateSum\n\nAdds two numbers...",
  "completed_at": "2026-03-31T08:00:05Z"
}
```

## Error Response Format

```json
{
  "task_id": 101,
  "status": "failed",
  "error": "Model timeout: request exceeded 30s",
  "retry_count": 1,
  "completed_at": "2026-03-31T08:00:35Z"
}
```

## Queue Topics

| Topic | Consumer |
|---|---|
| `agent.documentation` | Documentation Agent |
| `agent.code` | Code Agent |
| `agent.explanation` | Explanation Agent |
| `agent.search` | Search Agent |
| `agent.debug` | Debug Agent |
| `agent.test` | Test Agent |
| `agent.results` | Sync Service |

## Retry Policy

- Max retries: 3
- Backoff: exponential (1s, 2s, 4s)
- Dead letter queue: `agent.dlq` for permanently failed tasks
