# Database Design

## SQL Tables (PostgreSQL)

| Table | Purpose |
|---|---|
| `users` | User accounts and credentials |
| `projects` | Editor projects per user |
| `files` | Code/text files per project |
| `agent_tasks` | AI agent job records |
| `versions` | File version snapshots |

## Table Columns

### Users
- `user_id`, `name`, `email`, `password`, `role`, `created_at`

### Projects
- `project_id`, `user_id`, `project_name`, `description`, `created_at`

### Files
- `file_id`, `project_id`, `file_name`, `file_content`, `updated_at`

### AgentTasks
- `task_id`, `project_id`, `file_id`, `agent_type`, `status`, `input_data`, `result`, `priority`, `created_at`, `completed_at`

### Versions
- `version_id`, `file_id`, `content`, `created_by`, `created_at`

## NoSQL Collections (MongoDB)

| Collection | Purpose |
|---|---|
| `project_memory` | Chat history, agent outputs, logs, embeddings |
