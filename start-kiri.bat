@echo off
setlocal
echo ⚡ Starting Kiri Multi-Agent Editor (Phase 6: Professional Expansion)
echo ─────────────────────────────────────────────────────────────

:: [0] Initialize Environment
echo [0] Initializing environment...
node initialize.js
if %errorLevel% neq 0 (
    echo [WARNING] Initialization script encountered issues.
)

:: [1] Ensure Docker is running
echo [1] Ensuring Docker is running...
docker version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Docker engine is not running or unreachable.
    echo Please make sure Docker Desktop is open and the engine has started.
    echo.
    echo If you want to run in "Standalone Mode" (without Docker), 
    echo please refer to docs/standalone_dev.md (Coming Soon).
    pause
    exit /b
)

:: [2] Check for OpenRouter API Key
echo [2] Checking for OPENROUTER_API_KEY...
findstr "OPENROUTER_API_KEY=sk-" backend\agent-manager\.env >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] OPENROUTER_API_KEY missing in backend\agent-manager\.env
    echo AI Agents may operate in simulation mode or fail.
)

:: [3] Launch Professional Microservices Cluster
echo [3] Launching Professional Microservices Cluster...
docker-compose up --build -d

echo ─────────────────────────────────────────────────────────────
echo ✅ Kiri Professional Editor is launching!
echo 🌐 Access the Editor at: http://localhost
echo 🔍 Search Service:      Active
echo 🚀 Redis Caching:      Active
echo 📊 Monitoring:          http://localhost:3000 (Grafana)
echo ─────────────────────────────────────────────────────────────
echo To view real-time logs: docker-compose logs -f
echo To shutdown system:     docker-compose down
echo ─────────────────────────────────────────────────────────────
pause
