# Agent Manager

## Responsibilities

- Receive agent task requests from the API Gateway
- Assign tasks to the appropriate agent type
- Track agent task status (pending → in progress → completed/failed)
- Store results in the database
- Maintain agent execution logs
- Handle retries for failed tasks
- Manage agent priority queuing

## Agent Task Object

```json
{
  "task_id": 101,
  "project_id": 55,
  "file_id": 22,
  "agent_type": "documentation",
  "input_data": "Generate documentation for the calculateSum function",
  "status": "pending",
  "result": null,
  "priority": 1,
  "created_at": "2026-03-31T08:00:00Z",
  "completed_at": null
}
```

## Task Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED
                    ↘ FAILED → RETRY → COMPLETED
```

## Agent Priority

| Priority | Agent Type |
|---|---|
| 1 (Highest) | Debug Agent |
| 2 | Code Agent |
| 3 | Explanation Agent |
| 4 | Documentation Agent |
| 5 | Search Agent |
| 6 | Test Agent |
