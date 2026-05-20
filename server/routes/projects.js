const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function getFilesRecursively(dir, rootDir = dir) {
  let results = [];
  try {
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      if (['node_modules', '.git', 'dist', '.next', '.agent-backups'].includes(file) || file.startsWith('.')) return;
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath, rootDir));
        } else if (stat && stat.isFile()) {
          // Ignore files larger than 3MB to prevent UI lockup and memory exhaustion
          if (stat.size > 3 * 1024 * 1024) return;
          
          const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
          results.push({
            name: relativePath,
            path: fullPath,
            size: stat.size,
            mtime: stat.mtimeMs
          });
        }
      } catch (err) {
        console.error(`[File Scan Error] Skipping path ${fullPath}:`, err.message);
      }
    });
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
      const cleanedDbFiles = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(req.params.id);

      // 2. Identify and delete DB entries for files that do not exist on disk
      cleanedDbFiles.forEach(dbFile => {
        const existsOnDisk = diskFiles.some(df => df.name === dbFile.file_name);
        if (!existsOnDisk) {
          try {
            db.prepare('DELETE FROM files WHERE file_id = ?').run(dbFile.file_id);
          } catch (e) {
            console.error(`Failed to delete orphaned file item:`, e.message);
          }
        }
      });

      // 3. For each file on disk, insert if missing or update if content differs (using size/mtime check)
      diskFiles.forEach(df => {
        try {
          const existing = db.prepare('SELECT * FROM files WHERE project_id = ? AND file_name = ?').get(req.params.id, df.name);

          if (!existing) {
            const fileContent = fs.readFileSync(df.path, 'utf8');
            const ext = df.name.split('.').pop() || 'javascript';
            db.prepare('INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)')
              .run(uuidv4(), req.params.id, df.name, fileContent, ext);
            
            // Set size and mtime on the inserted object so future requests skip reading
            const newlyInserted = db.prepare('SELECT * FROM files WHERE project_id = ? AND file_name = ?').get(req.params.id, df.name);
            if (newlyInserted) {
              newlyInserted.size = df.size;
              newlyInserted.mtime = df.mtime;
            }
          } else if (existing.size !== df.size || existing.mtime !== df.mtime) {
            const fileContent = fs.readFileSync(df.path, 'utf8');
            db.prepare('UPDATE files SET file_content = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?')
              .run(fileContent, existing.file_id);
            
            // Update cache stats on the object
            existing.size = df.size;
            existing.mtime = df.mtime;
          }
        } catch (err) {
          console.error(`Failed to sync file ${df.name}:`, err.message);
        }
      });
      
      // Save database changes
      db.save();
    }
  } catch (err) {
    console.error(`Failed to sync project workspace directory:`, err.message);
  }

  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY file_name').all(req.params.id);
  res.json({ ...project, files });
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
