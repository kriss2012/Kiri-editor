# CI/CD Pipeline

## Overview

The project uses **GitHub Actions** for automated testing, building, and deployment.

## Pipeline Stages

```
Code Push → GitHub
     |
  Lint & Test
     |
  Docker Build
     |
  Push to Registry (Docker Hub / ECR)
     |
  Deploy to Kubernetes (kubectl apply)
     |
  Health Check
     |
  Notify Team (Slack)
```

## GitHub Actions Workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t kiri-editor:${{ github.sha }} .
      - name: Push to Docker Hub
        run: docker push kiri-editor:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/editor-service \
            editor-service=kiri-editor:${{ github.sha }}
          kubectl rollout status deployment/editor-service
```

## Environments

| Branch | Environment | Auto-deploy |
|---|---|---|
| `develop` | Staging | Yes |
| `main` | Production | Manual approval required |
