const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const IGNORED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.mp3', '.exe', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.sqlite', '.db', '.ttf', '.woff', '.woff2', '.eot', '.ico', '.svg', '.webp'];

function getFilesRecursively(dir, rootDir = dir, count = { val: 0 }) {
  let results = [];
  try {
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (count.val > 2000) break; // Hard limit on number of files scanned to prevent hangs
      if (['node_modules', '.git', 'dist', '.next', '.agent-backups', 'build'].includes(file) || file.startsWith('.')) continue;
      
      const ext = path.extname(file).toLowerCase();
      if (IGNORED_EXTS.includes(ext)) continue;

      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath, rootDir, count));
        } else if (stat && stat.isFile()) {
          // Ignore files larger than 256KB to prevent UI lockup and memory exhaustion
          if (stat.size > 256 * 1024) continue;
          
          const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
          results.push({
            name: relativePath,
            path: fullPath,
            size: stat.size,
            mtime: stat.mtimeMs
          });
          count.val++;
        }
      } catch (err) {
        console.error(`[File Scan Error] Skipping path ${fullPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[Dir Scan Error] Skipping directory ${dir}:`, err.message);
  }
  return results;
}

// POST /api/projects — create project
router.post('/', authMiddleware, (req, res) => {
  const { projectName, description } = req.body;
  if (!projectName) return res.status(400).json({ error: 'Project name required' });

  const projectId = uuidv4();
  db.prepare('INSERT INTO projects (project_id, user_id, project_name, description) VALUES (?, ?, ?, ?)')
    .run(projectId, req.user.userId, projectName, description || '');

  // Create default files
  const defaultFiles = [
    { name: 'main.js', content: '// Welcome to Kiri Editor!\n// Start coding here...\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n', lang: 'javascript' },
    { name: 'README.md', content: `# ${projectName}\n\nThis project was created with **Kiri Editor**.\n\n## Getting Started\n\nStart editing \`main.js\` and use the Agent Panel to get AI assistance.\n`, lang: 'markdown' },
  ];

  defaultFiles.forEach(f => {
    db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), projectId, f.name, f.content, f.lang);
  });

  res.status(201).json({ projectId, projectName, description });
});

// GET /api/projects — list user projects
router.get('/', authMiddleware, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
  res.json(projects);
});

// GET /api/projects/:id — get project with files
router.get('/:id', authMiddleware, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE project_id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Sync files from filesystem
  const projDir = project.custom_path || path.join(db.workspace, project.project_name);
  try {
    if (fs.existsSync(projDir)) {
      const diskFiles = getFilesRecursively(projDir);
      const dbFiles = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(req.params.id);

      // 1. Clear duplicate file items from database
      const seenNames = new Set();
      const duplicates = [];
      dbFiles.forEach(f => {
        if (seenNames.has(f.file_name)) {
          duplicates.push(f.file_id);
        } else {
          seenNames.add(f.file_name);
        }
      });
      duplicates.forEach(id => {
        try {
          db.prepare('DELETE FROM files WHERE file_id = ?').run(id);
        } catch (e) {
          console.error(`Failed to delete duplicate file item:`, e.message);
        }
      });

      // Refresh DB files list after duplicate cleanup
      const cleanedDbFiles = db.data.files.filter(f => f.project_id === req.params.id);

      // 2. Identify and delete DB entries for files that do not exist on disk
      db.data.files = db.data.files.filter(f => {
        if (f.project_id !== req.params.id) return true;
        return diskFiles.some(df => df.name === f.file_name);
      });

      // 3. For each file on disk, insert if missing or update if content differs
      diskFiles.forEach(df => {
        try {
          const existing = db.data.files.find(f => f.project_id === req.params.id && f.file_name === df.name);
          const ext = df.name.split('.').pop() || 'javascript';

          if (!existing) {
            db.data.files.push({
                file_id: uuidv4(),
                project_id: req.params.id,
                file_name: df.name,
                file_content: "", // We don't store local file content in the DB JSON to prevent bloat
                language: ext,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                size: df.size,
                mtime: df.mtime
            });
          } else {
            existing.updated_at = new Date().toISOString();
            existing.size = df.size;
            existing.mtime = df.mtime;
          }
        } catch (err) {
          console.error(`Failed to sync file ${df.name}:`, err.message);
        }
      });
      
      // Save database changes ONCE
      db.save();
    }
  } catch (err) {
    console.error(`Failed to sync project workspace directory:`, err.message);
  }

  // Fetch the final list of files (do NOT read all contents from disk synchronously to avoid OOM / hangs)
  const dbFiles = db.data.files.filter(f => f.project_id === req.params.id).sort((a,b) => a.file_name.localeCompare(b.file_name));
  
  const populatedFiles = dbFiles.map(f => {
    return { ...f, file_content: f.file_content || "" };
  });

  res.json({ ...project, files: populatedFiles });
});

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM files WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE project_id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  res.json({ success: true });
});

// POST /api/projects/import-local — Import a local folder as a project
router.post('/import-local', authMiddleware, (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'Folder path is required' });

  // Resolve backslashes and normalize path
  const normalizedPath = path.resolve(folderPath).replace(/\\/g, '/');

  if (!fs.existsSync(normalizedPath)) {
    return res.status(400).json({ error: 'Folder path does not exist on your local system' });
  }

  const stat = fs.statSync(normalizedPath);
  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Provided path is not a directory' });
  }

  const projectName = path.basename(normalizedPath) || 'imported-project';
  const projectId = uuidv4();

  // Insert project with custom_path parameter
  db.prepare('INSERT INTO projects (project_id, user_id, project_name, description, custom_path) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, req.user.userId, projectName, `Local workspace: ${normalizedPath}`, normalizedPath);

  res.status(201).json({ projectId, projectName, folderPath: normalizedPath });
});

module.exports = router;
