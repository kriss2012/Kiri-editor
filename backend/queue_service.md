# Queue Service

## Overview

Manages the async agent task pipeline using a distributed message queue.

## Technology

- **Kafka** (preferred for high throughput) or **RabbitMQ** (simpler setup)
- Producers: Agent Manager Service
- Consumers: Agent Workers

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
| `agent.dlq` | Dead Letter Queue (failed tasks) |

## Message Format

```json
{
  "task_id": 101,
  "agent": "documentation",
  "project_id": 55,
  "file_id": 22,
  "input": "Generate documentation for this file",
  "priority": 1,
  "enqueued_at": "2026-03-31T08:00:00Z"
}
```

## Configuration (Kafka)

```yaml
num.partitions: 6
replication.factor: 3
retention.ms: 86400000   # 24 hours
```

## Retry Policy

- Max retries: 3
- Backoff: exponential (1s → 2s → 4s)
- After 3 failures: route to `agent.dlq` for manual inspection
