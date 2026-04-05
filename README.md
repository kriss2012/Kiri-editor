# Kiri Editor – Multi-Agent Editor System

> A distributed, AI-powered code editor where multiple AI agents work together on shared project data — inspired by Antigravity AI Editor.

---

## System Features

- **Multi-agent architecture** – 6 specialized AI agents working in parallel
- **Real-time collaborative editor** – Monaco-based editor with WebSocket sync
- **Shared project memory** – All agents share the same project context
- **Event-driven architecture** – Kafka-based async processing
- **Microservices architecture** – 14 independent, scalable services
- **Message queue processing** – Reliable async agent task delivery
- **Distributed database** – PostgreSQL (SQL) + MongoDB (NoSQL)
- **Horizontal scaling** – Stateless services behind load balancer
- **Kubernetes deployment** – HPA for auto-scaling agent pods
- **Monitoring & logging** – Prometheus + Grafana + ELK Stack
- **Security** – JWT authentication, RBAC, rate limiting, encryption

---

## Agents

| Agent | Responsibility |
|---|---|
| Documentation Agent | Generates documentation from code |
| Code Agent | Generates code from natural language prompts |
| Explanation Agent | Explains code in plain English |
| Search Agent | Searches internet and project database |
| Debug Agent | Identifies and fixes code errors |
| Test Agent | Generates unit tests automatically |

---

## Architecture Components

| Component | Technology |
|---|---|
| API Gateway | Nginx / Kong |
| Load Balancer | AWS ELB |
| Application Servers | Node.js / Python |
| Agent Manager | Python |
| Message Queue | Kafka / RabbitMQ |
| Redis Cache | Redis 7 |
| SQL Database | PostgreSQL 16 |
| NoSQL Database | MongoDB 7 |
| File Storage | AWS S3 |
| CDN | Cloudflare |
| Sync Service | Node.js + WebSockets |
| Containerization | Docker |
| Orchestration | Kubernetes |

---

## Project Structure

```
Kiri-editor/
│
├── README.md
├── architecture/          # System overview, microservices, scaling, etc.
├── agents/               # Agent specs: manager, protocol, all 6 agents
├── backend/              # API gateway, auth, editor, sync, queue services
├── database/             # SQL schema, NoSQL schema, ER diagram, sharding
├── deployment/           # Docker, Kubernetes, CI/CD configs
├── diagrams/             # Architecture, workflow, agent flow diagrams
├── api/                  # API endpoint documentation
├── docs/                 # System design, architecture, database, scaling docs
└── cache/                # Redis structure and cache strategy
```

---

## Quick Architecture View

```
Users → API Gateway → Load Balancer → App Servers
                                           |
                                     Agent Manager
                                           |
                                     Message Queue
                                           |
                              [ Doc | Code | Debug | Test | Search | Explain ]
                                           |
                                     Redis Cache
                                           |
                              PostgreSQL + MongoDB + S3
                                           |
                              Sync Service → WebSockets → Users
```

---

## Phase 5: Production Hardening
- **AI Service**: Transitioned to **OpenRouter** for agent tasks, supporting multiple high-performance models (Gemini, Claude, GPT).
- **Caching**: Implemented **Redis Caching** for agent results, reducing API costs and latency.
- **Security**: Hardened Auth Service with **rate limiting**; Nginx Gateway with **security headers** and **gzip**.
- **Observability**: Integrated a **Real-time Terminal Panel** in the IDE for system logs and agent feedback.
- **Deployment**: Full **Kubernetes manifests** and environment templates for production-ready orchestration.

---

## This System Is
> **Production-level system design** — equivalent to **Google Docs + GitHub Copilot + ChatGPT Agents** combined, built on a distributed microservices architecture.
