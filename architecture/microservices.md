# Microservices Architecture

## Services

| # | Service |
|---|---|
| 1 | API Gateway |
| 2 | Auth Service |
| 3 | Editor Service |
| 4 | Agent Manager |
| 5 | Sync Service |
| 6 | Queue Service |
| 7 | File Storage Service |
| 8 | Notification Service |
| 9 | Search Service |
| 10 | Monitoring Service |

## Architecture Flow

```
Client
  |
API Gateway
  |
----------------------------
| Auth Service              |
| Editor Service            |
| Agent Manager             |
| Sync Service              |
| File Service              |
----------------------------
  |
Message Queue
  |
Agents Cluster
  |
Database + Cache
```

## Service Responsibilities

### API Gateway
- Routes all incoming requests
- Handles rate limiting and authentication checks
- Centralized logging and monitoring entry point

### Auth Service
- JWT token generation and validation
- User registration and login
- Role-based access control (RBAC)

### Editor Service
- Monaco-based real-time text and code editing
- File save and load operations
- File version management

### Agent Manager
- Receives user agent requests
- Assigns tasks to agent workers
- Tracks task status and manages retries

### Sync Service
- Broadcasts changes via WebSockets
- Ensures all clients and agents see the same state using CRDT / Operational Transform

### Queue Service
- Manages async task processing via Kafka or RabbitMQ
- Provides guaranteed delivery and retry logic

### File Storage Service
- Stores project files on AWS S3
- Manages CDN invalidation for static assets

### Notification Service
- Sends real-time alerts for task completion
- Supports in-app and email notifications

### Search Service
- Full-text search over project files and documentation
- Elasticsearch integration

### Monitoring Service
- Prometheus metrics collection
- Grafana dashboards
- Alerting on system anomalies
