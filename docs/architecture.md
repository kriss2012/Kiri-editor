# Architecture

## Overview

```
Client → API Gateway → Load Balancer → App Servers → Agent Manager
                                               |
                                          Message Queue
                                               |
                                            Agents
                                               |
Redis Cache → SQL DB → NoSQL DB → File Storage → CDN
```

## Components

| # | Component | Technology |
|---|---|---|
| 1 | API Gateway | Nginx / Kong |
| 2 | Load Balancer | AWS ELB |
| 3 | Application Servers | Node.js / Python |
| 4 | Agent Manager | Python |
| 5 | Message Queue | Kafka |
| 6 | Redis Cache | Redis 7 |
| 7 | SQL Database | PostgreSQL 16 |
| 8 | NoSQL Database | MongoDB 7 |
| 9 | CDN | Cloudflare |
| 10 | Sync Service | Node.js + WebSockets |
