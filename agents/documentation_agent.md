# Documentation Agent

## Purpose

Automatically generates documentation for code files, functions, classes, and modules inside the editor.

## Input

- Source code file content
- Function / class name (optional scope)
- User's description or prompt

## Process

1. Receives task from Agent Manager via Message Queue
2. Parses the code using AST analysis
3. Generates docstrings, README sections, and API docs
4. Formats output as Markdown
5. Saves result to NoSQL database (MongoDB)
6. Sync Service pushes result back to editor

## Output

- Markdown documentation
- Inline docstrings
- README.md sections

## Example

**Input:**
```python
def calculate_sum(a, b):
    return a + b
```

**Output:**
```markdown
## calculate_sum

**Description:** Adds two numbers and returns the result.

**Parameters:**
- `a` (int/float): First number
- `b` (int/float): Second number

**Returns:** Sum of `a` and `b`
```
