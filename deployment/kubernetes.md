# Kubernetes Deployment

## Pods

| Pod | Replicas | Description |
|---|---|---|
| api-gateway | 2 | Nginx ingress and routing |
| auth-service | 2 | JWT auth microservice |
| editor-service | 3 | Code editor backend |
| agent-manager | 2 | Agent orchestration |
| sync-service | 3 | WebSocket sync service |
| redis | 1 | Cache (StatefulSet) |
| postgres | 1 | SQL DB (StatefulSet) |
| mongodb | 1 | NoSQL DB (StatefulSet) |
| kafka | 3 | Message broker (StatefulSet) |
| agents | 10 | Agent worker pods (scalable) |

## Services

| Service | Type | Purpose |
|---|---|---|
| api-gateway-svc | LoadBalancer | External traffic entry |
| auth-service-svc | ClusterIP | Internal auth calls |
| editor-service-svc | ClusterIP | Internal editor calls |
| agent-manager-svc | ClusterIP | Internal agent calls |
| sync-service-svc | ClusterIP | Internal sync calls |

## Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kiri-ingress
spec:
  rules:
    - host: kiri-editor.io
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway-svc
                port:
                  number: 80
```

## Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agents-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agents
  minReplicas: 5
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
