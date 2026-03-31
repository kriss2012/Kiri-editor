# Microservices List (Final)

## Services

| # | Service | Technology | Responsibility |
|---|---|---|---|
| 1 | API Gateway | Nginx / Kong | Routing, rate limiting, auth check |
| 2 | Auth Service | Node.js / Express | JWT auth, user management |
| 3 | User Service | Node.js | User profile CRUD |
| 4 | Project Service | Node.js | Project management |
| 5 | Editor Service | Node.js + Monaco | Real-time code editing |
| 6 | Agent Manager Service | Python / Node.js | Task orchestration |
| 7 | Sync Service | Node.js + WS | Real-time data sync |
| 8 | Queue Service | Kafka / RabbitMQ | Async task queuing |
| 9 | File Service | Node.js + S3 | File upload/download |
| 10 | Search Service | Elasticsearch | Full-text search |
| 11 | Notification Service | Node.js | Real-time alerts |
| 12 | Monitoring Service | Prometheus | Metrics collection |
| 13 | Logging Service | ELK Stack | Log aggregation |
| 14 | Analytics Service | Python | Usage analytics |

## Communication

- **Synchronous**: REST / gRPC (for time-sensitive operations)
- **Asynchronous**: Message Queue (for agent tasks, notifications)
- **Real-time**: WebSockets (for editor sync)
