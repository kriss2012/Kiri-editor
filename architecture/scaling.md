# Scaling Strategy

## When Users Increase

| Step | Action |
|---|---|
| 1 | Add Load Balancer (Nginx / AWS ELB) |
| 2 | Add Multiple Application Servers |
| 3 | Add Redis Cache for sessions and hot data |
| 4 | Add CDN for static assets (Cloudflare) |
| 5 | Add Message Queue (Kafka / RabbitMQ) |
| 6 | Database Sharding (by user ID range) |
| 7 | Kubernetes Auto Scaling (HPA) |
| 8 | Monitoring and Logging (Prometheus + Grafana + ELK) |

## Database Sharding

Split the database when user count grows:

```
Shard 1 → Users 1 – 100,000
Shard 2 → Users 100,001 – 200,000
Shard 3 → Users 200,001 – 300,000
```

## Horizontal Scaling

- Stateless application servers can be cloned freely
- Redis stores shared session state
- All heavy agent tasks go through the queue

## Kubernetes Auto-Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: editor-service-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: editor-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
