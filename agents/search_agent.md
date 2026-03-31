# Search Agent

## Purpose

Searches the internet, internal project database, and documentation to find relevant information.

## Input

- Search query string
- Search scope: `internet | project | docs | all`

## Process

1. Receives task from Agent Manager via Message Queue
2. Identifies search scope from the task metadata
3. Queries the appropriate source:
   - **Internet**: External search API (e.g., Google, Bing, Tavily)
   - **Project**: Internal full-text search via Elasticsearch
   - **Docs**: Searches indexed documentation files
4. Ranks results by relevance
5. Returns top results with snippets

## Output

- List of results with title, snippet, and source URL
- Summarized answer from top results

## Example

**Input:** `"How to implement binary search in Python"`

**Output:**
```
Result 1: Binary Search in Python – GeeksforGeeks
Snippet: Binary search is a search algorithm that works on sorted arrays...
URL: https://geeksforgeeks.org/...

Result 2: Python docs – bisect module
Snippet: The bisect module provides support for maintaining a list in sorted order...
URL: https://docs.python.org/...
```
