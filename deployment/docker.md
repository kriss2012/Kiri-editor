# Docker Setup

## Containers

| Container | Image | Port |
|---|---|---|
| api_gateway | nginx:latest | 80, 443 |
| auth_service | node:20-alpine | 3001 |
| editor_service | node:20-alpine | 3002 |
| agent_manager | python:3.11-slim | 3003 |
| sync_service | node:20-alpine | 3004 |
| redis | redis:7-alpine | 6379 |
| postgres | postgres:16-alpine | 5432 |
| mongodb | mongo:7 | 27017 |
| kafka | confluentinc/cp-kafka | 9092 |
| agents | python:3.11-slim | - |

## docker-compose.yml (excerpt)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: kiri_editor
      POSTGRES_USER: kiri
      POSTGRES_PASSWORD: kiri_secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mongodb:
    image: mongo:7
    volumes:
      - mongodata:/data/db

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092

  auth_service:
    build: ./backend/auth_service
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  editor_service:
    build: ./backend/editor_service
    ports:
      - "3002:3002"
    depends_on:
      - postgres

  agent_manager:
    build: ./agents/agent_manager
    ports:
      - "3003:3003"
    depends_on:
      - kafka
      - postgres

  sync_service:
    build: ./backend/sync_service
    ports:
      - "3004:3004"
    depends_on:
      - redis

volumes:
  pgdata:
  mongodata:
```
