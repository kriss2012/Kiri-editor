# Agents Design

## Agents

| Agent | Input | Process | Output |
|---|---|---|---|
| Documentation Agent | Code | Generate docs | Markdown |
| Code Agent | Prompt | Generate code | Code |
| Explanation Agent | Code | Explain | Text |
| Search Agent | Query | Search | Results |
| Debug Agent | Error + Code | Fix code | Fixed code |
| Test Agent | Code | Create tests | Test cases |

## Agent Workflow

```
User Request → Agent Manager → Queue → Agent → Database → Sync → Editor
```

## Agent Architecture

Each agent is a standalone Python microservice that:
1. Consumes tasks from its dedicated Kafka topic
2. Processes the task using an AI model (LLM / RAG)
3. Stores results in MongoDB (agent_outputs)
4. Updates the task status in PostgreSQL
5. Notifies the Sync Service upon completion
