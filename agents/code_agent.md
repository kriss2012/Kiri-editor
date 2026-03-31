# Code Agent

## Purpose

Generates code from natural language prompts or partial code snippets.

## Input

- Natural language instruction
- Existing code context (optional)
- Language/framework preference

## Process

1. Receives task from Agent Manager via Message Queue
2. Analyzes project context from shared database
3. Generates code using the AI model
4. Validates syntax and runs basic linting
5. Saves result to database
6. Sync Service pushes result to the editor

## Output

- Complete code implementation
- Code blocks with proper syntax highlighting
- Comments explaining the logic

## Example

**Input:** `"Create a function that filters users by active status"`

**Output:**
```python
def filter_active_users(users: list[dict]) -> list[dict]:
    """
    Filters the given list of users and returns only active users.

    Args:
        users: List of user dictionaries with an 'is_active' key.

    Returns:
        List of active users.
    """
    return [user for user in users if user.get("is_active", False)]
```

## Supported Languages

- Python, JavaScript, TypeScript, Java, C++, Go, Rust, SQL
