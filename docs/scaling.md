# Scaling Strategy

## When Users Increase

| When | Action |
|---|---|
| Users > 10K | Add Load Balancer, Redis Cache |
| Users > 100K | Add CDN, Message Queue |
| Users > 500K | Database Sharding |
| Users > 1M | Kubernetes Auto-Scaling, multi-region |

## Horizontal Scaling Steps

1. Add Load Balancer (Nginx / AWS ELB)
2. Add multiple application server replicas
3. Use Redis for shared session state
4. Use CDN (Cloudflare) to offload static content
5. Add Kafka for async processing under load
6. Split DB shards by `user_id` range
7. Enable Kubernetes HPA for agent pods
8. Add Prometheus + Grafana for monitoring

## Bottleneck Solutions

| Bottleneck | Solution |
|---|---|
| DB overload | Redis cache + read replicas + sharding |
| Agent queue backlog | Scale Kafka partitions + more agent pods |
| Sync latency | Horizontal scale WebSocket servers |
| File storage latency | CDN + pre-signed S3 URLs |
