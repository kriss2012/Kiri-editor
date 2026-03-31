# Test Agent

## Purpose

Automatically generates unit tests for code functions, classes, and modules.

## Input

- Source code to test
- Test framework preference (pytest / jest / mocha / JUnit)
- Coverage requirements (optional)

## Process

1. Receives task from Agent Manager via Message Queue
2. Parses the source code to identify testable units (functions, classes, methods)
3. Generates test cases covering:
   - Happy path (normal input)
   - Edge cases (empty, null, boundary values)
   - Error cases (expected exceptions)
4. Returns test file with all test cases

## Output

- Complete test file
- Test coverage estimate

## Example

**Input:**
```python
def calculate_sum(a, b):
    return a + b
```

**Output (pytest):**
```python
import pytest
from mymodule import calculate_sum

def test_sum_positive_numbers():
    assert calculate_sum(2, 3) == 5

def test_sum_negative_numbers():
    assert calculate_sum(-1, -1) == -2

def test_sum_zero():
    assert calculate_sum(0, 0) == 0

def test_sum_mixed():
    assert calculate_sum(-5, 5) == 0

def test_sum_large_numbers():
    assert calculate_sum(1_000_000, 2_000_000) == 3_000_000
```
