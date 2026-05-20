# Database Sharding Strategy

## Why Sharding?

When the number of users exceeds 500K+, a single database becomes a bottleneck. Sharding distributes the load across multiple database instances.

## Sharding Key

**Shard by `user_id`** (range-based sharding)

| Shard | User ID Range |
|---|---|
| Shard 1 | 1 – 100,000 |
| Shard 2 | 100,001 – 200,000 |
| Shard 3 | 200,001 – 300,000 |
| Shard N | ... |

## Routing Logic

```python
def get_shard(user_id: int) -> str:
    shard_number = (user_id // 100_000) + 1
    return f"shard_{shard_number}"
```

## Cross-Shard Queries

Avoid cross-shard joins by:
- Denormalizing frequently joined data
- Using a central metadata service to route queries
- Caching cross-shard aggregations in Redis

## Replication

Each shard has:
- 1 Primary (read/write)
- 2 Replicas (read-only, failover)

## Future: Hash-Based Sharding

For even distribution without re-sharding pain:

```
shard = hash(user_id) % total_shards
```
