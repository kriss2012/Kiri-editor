-- Multi-Agent Editor System – SQL Schema
-- Database: PostgreSQL

CREATE TABLE users (
  user_id   SERIAL PRIMARY KEY,
  name      TEXT        NOT NULL,
  email     TEXT        NOT NULL UNIQUE,
  password  TEXT        NOT NULL,
  role      TEXT        NOT NULL DEFAULT 'developer',
  created_at TIMESTAMP  NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  project_id   SERIAL PRIMARY KEY,
  user_id      INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  project_name TEXT        NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE files (
  file_id      SERIAL PRIMARY KEY,
  project_id   INT         NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  file_content TEXT,
  updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_tasks (
  task_id    SERIAL PRIMARY KEY,
  project_id INT         NOT NULL REFERENCES projects(project_id),
  file_id    INT         REFERENCES files(file_id),
  agent_type TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pending',
  input_data TEXT,
  result     TEXT,
  priority   INT         NOT NULL DEFAULT 5,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE versions (
  version_id  SERIAL PRIMARY KEY,
  file_id     INT         NOT NULL REFERENCES files(file_id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_by  INT         REFERENCES users(user_id),
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id     ON projects(user_id);
CREATE INDEX idx_files_project_id     ON files(project_id);
CREATE INDEX idx_agent_tasks_project  ON agent_tasks(project_id);
CREATE INDEX idx_agent_tasks_status   ON agent_tasks(status);
CREATE INDEX idx_versions_file_id     ON versions(file_id);
