# Search Agent (Phase 6: Advanced Semantic Search)

## Purpose

Searches the internet, internal project database, and **semantically indexes the codebase** to find relevant information and code patterns.

## Input

- Search query string
- Search scope: `internet | project | codebase | docs | all`
- Context: `project_id`, `current_file_path`

## Process

1. Receives task from Agent Manager via Message Queue.
2. Identifies search scope from task metadata.
3. Queries the appropriate source:
   - **Internet**: External search API (Google, Bing, Tavily).
   - **Codebase (Phase 6)**: Queries the **Vector Service** to find semantically relevant code snippets across the entire project (even without exact keyword matches).
   - **Docs**: Searches indexed documentation files.
4. Ranks results by relevance using embeddings.
5. Returns top results with snippets and line numbers.

## Phase 6 Integration

The Search Agent now uses the **VectorService** in `backend/agent-manager/services/vector_service.js` to provide "Code-Aware" search. This allows other agents (like Debug or Code agents) to find related implementations in the project without manually exploring the file tree.

## Output

- List of results with title, snippet, and source (URL or File Path).
- **Semantically relevant snippets** from the project codebase.
- Summarized answer from top results.

## Example

**Input:** `"How do we handle JWT authentication in this project?"`

**Output:**
```
Found 2 snippets in codebase:

File: server/middleware/auth.js (Line 12)
Snippet: const verifyToken = (req, res, next) => { const token = req.headers['authorization']; ... }

File: server/routes/auth.js (Line 25)
Snippet: router.post('/login', async (req, res) => { const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET); ... })

Answer Summary:
The project uses JWT-based authentication. Middleware in 'server/middleware/auth.js' extracts the token from the 'authorization' header, and routes in 'server/routes/auth.js' handle token generation during login.
```
