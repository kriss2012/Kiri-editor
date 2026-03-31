# Data Model

## Overview

The data model follows a hierarchical structure rooted at the User.

## SQL Data Model (PostgreSQL)

```
User
 └── Projects
      └── Files
           ├── Versions
           └── AgentTasks
```

## NoSQL Data Model (MongoDB)

```
ProjectMemory
 ├── chat_history    → Conversation between user and agents
 ├── agent_outputs   → Full AI-generated content
 ├── context_memory  → Key-value pairs + vector embeddings
 └── logs            → Service-level debug/info/error logs
```

## Data Split Strategy

| Data Type | Storage |
|---|---|
| Users, Projects, Files, Tasks, Versions | PostgreSQL (structured, relational) |
| Chat history, Agent outputs, Logs, Embeddings | MongoDB (unstructured, flexible) |
| Active sessions, Search cache, Rate limits | Redis |
| Static assets, Large files | AWS S3 + CDN |

## Shared Project State

All agents and users access the same shared data object:

```
Project
 ├── Files            (SQL + S3)
 ├── Documentation    (NoSQL)
 ├── Code             (SQL Files table)
 ├── Agent Outputs    (NoSQL)
 ├── Chat History     (NoSQL)
 ├── Version History  (SQL Versions table)
 └── Metadata         (SQL Projects table)
```
