# API Gateway

## Overview

The API Gateway is the single entry point for all client requests. It handles routing, authentication verification, rate limiting, and logging.

## Responsibilities

- **Routing**: Forwards requests to the correct microservice
- **Authentication**: Validates JWT tokens before forwarding
- **Rate Limiting**: Prevents abuse (max 100 req/min per user)
- **Logging**: Logs all requests for audit and monitoring
- **Load Balancing**: Distributes traffic across service instances

## Endpoints Routed

| Route Pattern | Target Service |
|---|---|
| `/auth/**` | Auth Service |
| `/projects/**` | Project Service |
| `/files/**` | Editor Service |
| `/agents/**` | Agent Manager Service |
| `/sync/**` | Sync Service |
| `/search/**` | Search Service |

## Technology

- **Nginx** or **Kong API Gateway**
- Rate limiting via Redis counters
- JWT validation middleware

## Rate Limiting Config

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

server {
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://app_servers;
  }
}
```
