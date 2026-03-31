# Redis Cache Structure

## Overview

Redis is used for caching hot data, managing user sessions, and rate-limiting counters.

## Key Namespaces

| Namespace | TTL | Content |
|---|---|---|
| `session:<user_id>` | 1 hour | JWT session data |
| `file:<file_id>` | 5 minutes | Cached file content |
| `agent_result:<task_id>` | 30 minutes | Cached agent output |
| `search:<query_hash>` | 10 minutes | Search result cache |
| `rate_limit:<user_id>` | 1 minute | Request count for rate limiting |
| `project:<project_id>:users` | No expiry | Set of connected user IDs |

## Usage Examples

```bash
# Store a user session
SET session:21 "{user_id: 21, email: 'user@kiri.io', role: 'developer'}" EX 3600

# Cache a file's content
SET file:55 "<file content>" EX 300

# Increment rate limit counter
INCR rate_limit:21
EXPIRE rate_limit:21 60

# Track connected users in a project room
SADD project:12:users 21 33 45
SMEMBERS project:12:users
```

## Cache Invalidation

- File updated → `DEL file:<file_id>`
- Agent task completed → `DEL agent_result:<task_id>` → Set new result
- Search index updated → Flush relevant search cache keys
