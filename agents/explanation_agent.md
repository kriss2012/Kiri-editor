# Explanation Agent

## Purpose

Explains code to the user in plain English. Supports different explanation levels: beginner, intermediate, expert.

## Input

- Selected code snippet
- Explanation level (beginner / intermediate / expert)
- User's specific question (optional)

## Process

1. Receives task from Agent Manager via Message Queue
2. Parses the selected code
3. Generates a step-by-step explanation
4. Optionally generates an analogy or visual diagram description
5. Returns explanation as formatted Markdown

## Output

- Plain English explanation
- Step-by-step breakdown
- Analogies and examples when applicable

## Example

**Input:**
```python
result = [x**2 for x in range(10) if x % 2 == 0]
```

**Output (Beginner Level):**
> This line creates a list of squares of even numbers from 0 to 9.
>
> Step-by-step:
> 1. `range(10)` gives us numbers 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
> 2. `if x % 2 == 0` keeps only even numbers: 0, 2, 4, 6, 8
> 3. `x**2` squares each: 0, 4, 16, 36, 64
> 4. Result: `[0, 4, 16, 36, 64]`
