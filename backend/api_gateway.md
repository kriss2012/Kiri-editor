# API Gateway (Phase 6: Tracing & Observability)

## Overview

The API Gateway is the single entry point for all client requests. It handles routing, authentication verification, rate limiting, logging, and **Distributed Tracing**.

## Responsibilities

- **Routing**: Forwards requests to the correct microservice.
- **Authentication**: Validates JWT tokens before forwarding.
- **Rate Limiting**: Prevents abuse (max 100 req/min per user).
- **Logging**: Logs all requests for audit and monitoring.
- **Load Balancing**: Distributes traffic across service instances.
- **Distributed Tracing (Phase 6)**: Injects or propagates a `X-Trace-ID` for every request to enable end-to-end observability across the microservice mesh.

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

- **Nginx** / **Kong API Gateway**
- **OpenTelemetry** Collector integration
- Rate limiting via Redis counters
- JWT validation middleware

## Tracing & Rate Limiting Config

```nginx
# Phase 6: Inject trace ID if missing
set_misc_id $trace_id;
if ($http_x_trace_id = "") {
  add_header X-Trace-ID $trace_id;
}

limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

server {
  location /api/ {
    # Propagate trace ID to upstream
    proxy_set_header X-Trace-ID $http_x_trace_id;
    
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://app_servers;
  }
}
```
