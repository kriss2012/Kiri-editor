# Debug Agent

## Purpose

Identifies bugs and errors in code and provides corrected code with explanations.

## Input

- Code with the error or bug
- Error message / stack trace (optional)
- Programming language

## Process

1. Receives task from Agent Manager via Message Queue
2. Parses the code and error message
3. Identifies the root cause of the error
4. Generates a fix
5. Explains why the bug occurred and how it was fixed
6. Returns the fixed code

## Output

- Fixed code
- Bug explanation
- Prevention tips

## Example

**Input Code:**
```python
def divide(a, b):
    return a / b

result = divide(10, 0)
```

**Error:** `ZeroDivisionError: division by zero`

**Output:**
```python
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

try:
    result = divide(10, 0)
except ValueError as e:
    print(f"Error: {e}")
```

**Explanation:** The function was called with `b=0`, which causes a `ZeroDivisionError`. Added a guard clause to raise a descriptive error when `b` is zero, and wrapped the call in a try/except block.
