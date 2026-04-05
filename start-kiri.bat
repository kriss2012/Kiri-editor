@echo off
echo ⚡ Starting Kiri Multi-Agent Editor (Phase 4: Secure & Scalable)
echo ─────────────────────────────────────────────────────────────
echo [1] Ensuring Docker is running...
docker version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo [2] Checking for GEMINI_API_KEY...
if "%GEMINI_API_KEY%"=="" (
    echo [WARNING] GEMINI_API_KEY is not set. Agents will operate in simulation mode or fail.
)

echo [3] Launching Microservices Cluster via Docker Compose...
docker-compose up --build -d

echo ─────────────────────────────────────────────────────────────
echo ✅ Kiri Editor is launching!
echo 🌐 Access the Editor at: http://localhost
echo 📊 Monitoring (Prometheus): http://localhost:9090
echo 📈 Dashboards (Grafana): http://localhost:3000
echo ─────────────────────────────────────────────────────────────
echo To view logs, run: docker-compose logs -f
echo To stop, run: docker-compose down
pause
