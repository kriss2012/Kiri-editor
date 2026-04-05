# Kiri Editor — Startup & Operational Shortcuts

This file contains the essential commands and shortcuts for the Kiri Multi-Agent Editor (Phase 4).

## 🚀 Startup Shortcuts

| Command | Action |
|:---|:---|
| `./start-kiri.bat` | Start the full microservices cluster (Windows) |
| `docker-compose up -d --build` | Manually build and start all containers |
| `docker-compose logs -f` | Follow real-time logs from all services |
| `docker-compose down` | Stop the cluster and remove containers |
| `docker-compose ps` | List all running microservices |

### 🛠️ Service Endpoints

- **Editor UI**: [http://localhost](http://localhost)
- **Auth API**: [http://localhost/api/auth](http://localhost/api/auth)
- **Editor API**: [http://localhost/api/editor](http://localhost/api/editor)
- **Agent API**: [http://localhost/api/agents](http://localhost/api/agents)
- **Monitoring**: [http://localhost:9090](http://localhost:9090)
- **Dashboards**: [http://localhost:3000](http://localhost:3000)

---

## ⌨️ Editor Keyboard Shortcuts

Since Kiri uses the **Monaco Editor**, standard VSCode shortcuts apply:

### 💾 File Operations
- **`Ctrl + S`**: Manually trigger file save (auto-save is also active).
- **`Ctrl + B`**: Toggle Sidebars (Planned).
- **`Ctrl + F`**: Search inside current file.

### 🤖 AI Agent Shortcuts
- **`Alt + R`**: Run the currently selected Agent.
- **`Alt + C`**: Clear the Agent Chat history.
- **`Ctrl + Space`**: Trigger AI Code Completion (Planned).

### 🛠️ Editor Navigation
- **`Ctrl + P`**: Quick search for project files.
- **`Ctrl + \`**: Split editor view (Planned).

---

> [!TIP]
> **GEMINI\_API\_KEY**: Ensure this is set in your environment variables for real AI agents to function.
