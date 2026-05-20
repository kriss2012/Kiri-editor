# Agent Communication Protocol

Agents communicate using the Message Queue (Kafka / RabbitMQ) and the Agent Manager Orchestrator.

## Orchestration Task Format (New in Phase 6)
The Orchestrator receives high-level prompts and decomposes them.

```json
{
  "orchestration_id": "orch-12345",
  "user_prompt": "Refactor the Auth service and add unit tests",
  "context": {
    "project_id": 55,
    "active_file": "auth-service/index.js",
    "files": ["auth-service/index.js", "auth-service/utils.js"]
  },
  "status": "processing"
}
```

## Task Message Format
Standard format for individual agent tasks.

```json
{
  "task_id": 101,
  "orchestration_id": "orch-12345",
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
  "orchestration_id": "orch-12345",
  "status": "completed",
  "result": "# Function: calculateSum\n\nAdds two numbers...",
  "completed_at": "2026-03-31T08:00:05Z"
}
```

## Multi-Agent Hand-off
Agents can now signal dependencies if a task requires further processing (e.g., Code -> Test).

```json
{
  "task_id": 102,
  "next_agent": "test",
  "intermediate_result": "...",
  "status": "pending_handoff"
}
```

## Queue Topics

| Topic | Consumer |
|---|---|
| `agent.orchestrator` | Orchestrator Service |
| `agent.documentation` | Documentation Agent |
| `agent.code` | Code Agent |
| `agent.explanation` | Explanation Agent |
| `agent.search` | Search Agent |
| `agent.debug` | Debug Agent |
| `agent.test` | Test Agent |
| `agent.results` | Sync Service / Orchestrator |

## Retry Policy

- Max retries: 3
- Backoff: exponential (1s, 2s, 4s)
- Dead letter queue: `agent.dlq` for permanently failed tasks
