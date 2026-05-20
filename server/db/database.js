const fs = require('fs');
const path = require('path');

class JSONDatabase {
  constructor() {
    let dbFolder;
    // Standard AppData path if running as an Electron app, fallback to local directory
    if (process.versions.electron) {
      const { app } = require('electron');
      dbFolder = app.getPath('userData');
    } else {
      dbFolder = path.join(__dirname);
    }
    
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }
    
    this.filepath = path.join(dbFolder, 'kiri.json');
    this.workspace = path.join(dbFolder, 'KiriProjects');
    
    if (!fs.existsSync(this.workspace)) {
      fs.mkdirSync(this.workspace, { recursive: true });
    }
    
    console.log(`📡 [Kiri DB] Using pure JS database storage at: ${this.filepath}`);
    console.log(`📁 [Kiri Workspace] Storing actual files locally in: ${this.workspace}`);
    
    this.data = {
      users: [],
      projects: [],
      files: [],
      agent_tasks: [],
      versions: []
    };
    
    this.load();
  }
  
  load() {
    if (fs.existsSync(this.filepath)) {
      try {
        const fileContent = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(fileContent);
        // Ensure all required tables/arrays exist
        this.data.users = this.data.users || [];
        this.data.projects = this.data.projects || [];
        this.data.files = this.data.files || [];
        this.data.agent_tasks = this.data.agent_tasks || [];
        this.data.versions = this.data.versions || [];
      } catch (e) {
        console.error('⚠️ [Kiri DB] Failed to load JSON database, starting fresh:', e);
      }
    } else {
      this.save();
    }
  }
  
  save() {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('❌ [Kiri DB] Failed to save JSON database to disk:', e);
    }
  }
  
  pragma(sql) {
    // Mock better-sqlite3 pragma method
    return this;
  }
  
  exec(sql) {
    // Mock better-sqlite3 schema creation execution
    return this;
  }
  
  prepare(sql) {
    const self = this;
    const cleanSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    
    return {
      get(...params) {
        // ─── AUTHENTICATION QUERIES ───
        // SELECT user_id FROM users WHERE email = ?
        if (cleanSql.includes('select user_id from users where email =')) {
          const email = params[0];
          const user = self.data.users.find(u => u.email === email);
          return user ? { user_id: user.user_id } : undefined;
        }
        // SELECT * FROM users WHERE email = ?
        if (cleanSql.includes('select * from users where email =')) {
          const email = params[0];
          return self.data.users.find(u => u.email === email);
        }
        
        // ─── PROJECTS QUERIES ───
        // SELECT * FROM projects WHERE project_id = ? AND user_id = ?
        if (cleanSql.includes('select * from projects where project_id = ? and user_id = ?')) {
          const [projectId, userId] = params;
          return self.data.projects.find(p => p.project_id === projectId && p.user_id === userId);
        }
        
        // ─── FILES QUERIES ───
        // SELECT * FROM files WHERE file_id = ?
        if (cleanSql.includes('select * from files where file_id = ?')) {
          const fileId = params[0];
          return self.data.files.find(f => f.file_id === fileId);
        }
        // SELECT file_id FROM files WHERE project_id = ? AND file_name = ?
        if (cleanSql.includes('select file_id from files where project_id = ? and file_name = ?') ||
            cleanSql.includes('select * from files where project_id = ? and file_name = ?')) {
          const [projectId, fileName] = params;
          return self.data.files.find(f => f.project_id === projectId && f.file_name === fileName);
        }
        // SELECT file_name FROM files WHERE file_id = ?
        if (cleanSql.includes('select file_name from files where file_id = ?')) {
          const fileId = params[0];
          const file = self.data.files.find(f => f.file_id === fileId);
          return file ? { file_name: file.file_name } : undefined;
        }
        // SELECT file_content FROM files WHERE file_id = ?
        if (cleanSql.includes('select file_content from files where file_id = ?')) {
          const fileId = params[0];
          const file = self.data.files.find(f => f.file_id === fileId);
          if (file) {
            const proj = self.data.projects.find(p => p.project_id === file.project_id);
            if (proj) {
              const projDir = proj.custom_path || path.join(self.workspace, proj.project_name);
              const filePath = path.join(projDir, file.file_name);
              if (fs.existsSync(filePath)) {
                return { file_content: fs.readFileSync(filePath, 'utf8') };
              }
            }
            return { file_content: file.file_content };
          }
          return undefined;
        }
        
        // ─── AGENTS QUERIES ───
        // SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks WHERE task_id = ?
        if (cleanSql.includes('select task_id, agent_type, status, created_at, completed_at from agent_tasks where task_id = ?')) {
          const taskId = params[0];
          const t = self.data.agent_tasks.find(x => x.task_id === taskId);
          return t ? { task_id: t.task_id, agent_type: t.agent_type, status: t.status, created_at: t.created_at, completed_at: t.completed_at } : undefined;
        }
        // SELECT * FROM agent_tasks WHERE task_id = ?
        if (cleanSql.includes('select * from agent_tasks where task_id = ?')) {
          const taskId = params[0];
          return self.data.agent_tasks.find(x => x.task_id === taskId);
        }
        
        console.log(`⚠️ [Kiri DB] Unhandled GET: "${sql}"`, params);
        return undefined;
      },
      
      run(...params) {
        // ─── REGISTER USER ───
        // INSERT INTO users (user_id, name, email, password) VALUES (?, ?, ?, ?)
        if (cleanSql.includes('insert into users')) {
          const [userId, name, email, hashedPassword] = params;
          self.data.users.push({
            user_id: userId,
            name,
            email,
            password: hashedPassword,
            created_at: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        
        // ─── CREATE PROJECT ───
        // INSERT INTO projects (project_id, user_id, project_name, description) VALUES (?, ?, ?, ?)
        if (cleanSql.includes('insert into projects')) {
          const [projectId, userId, projectName, description, customPath] = params;
          self.data.projects.push({
            project_id: projectId,
            user_id: userId,
            project_name: projectName,
            description: description || '',
            custom_path: customPath || null,
            created_at: new Date().toISOString()
          });
          
          if (!customPath) {
            const projFolder = path.join(self.workspace, projectName);
            if (!fs.existsSync(projFolder)) {
               fs.mkdirSync(projFolder, { recursive: true });
            }
          }
          
          self.save();
          return { changes: 1 };
        }
        
        // ─── WRITE/CREATE FILES ───
        // INSERT INTO files (file_id, project_id, file_name, file_content, language) VALUES (?, ?, ?, ?, ?)
        if (cleanSql.includes('insert into files')) {
          const [fileId, projectId, fileName, fileContent, language] = params;
          self.data.files = self.data.files.filter(f => f.file_id !== fileId);
          self.data.files.push({
            file_id: fileId,
            project_id: projectId,
            file_name: fileName,
            file_content: fileContent || '',
            language: language || 'javascript',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          const proj = self.data.projects.find(p => p.project_id === projectId);
          if (proj) {
             const projDir = proj.custom_path || path.join(self.workspace, proj.project_name);
             const filePath = path.join(projDir, fileName);
             
             // Ensure parent directories exist (in case file is in a subdirectory)
             const parentDir = path.dirname(filePath);
             if (!fs.existsSync(parentDir)) {
               fs.mkdirSync(parentDir, { recursive: true });
             }
             fs.writeFileSync(filePath, fileContent || '', 'utf8');
          }
          
          self.save();
          return { changes: 1 };
        }
        // UPDATE files SET file_content = ?, language = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?
        if (cleanSql.includes('update files set')) {
          let fileContent, language, fileId;
          if (cleanSql.includes('language =')) {
            [fileContent, language, fileId] = params;
          } else {
            [fileContent, fileId] = params;
          }
          if (!fileId && params.length > 0) {
            fileId = params[params.length - 1];
          }
          const file = fileId ? self.data.files.find(f => f.file_id === fileId) : null;
          if (file) {
            file.file_content = fileContent !== undefined ? fileContent : file.file_content;
            if (language !== undefined) file.language = language;
            file.updated_at = new Date().toISOString();
            
            const proj = self.data.projects.find(p => p.project_id === file.project_id);
            if (proj && fileContent !== undefined) {
               const projDir = proj.custom_path || path.join(self.workspace, proj.project_name);
               const filePath = path.join(projDir, file.file_name);
               
               // Ensure parent directories exist
               const parentDir = path.dirname(filePath);
               if (!fs.existsSync(parentDir)) {
                 fs.mkdirSync(parentDir, { recursive: true });
               }
               fs.writeFileSync(filePath, fileContent, 'utf8');
            }
            
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }
        // DELETE FROM files WHERE project_id = ?
        if (cleanSql.includes('delete from files where project_id = ?')) {
          const projectId = params[0];
          const countBefore = self.data.files.length;
          self.data.files = self.data.files.filter(f => f.project_id !== projectId);
          self.save();
          return { changes: countBefore - self.data.files.length };
        }
        // DELETE FROM files WHERE file_id = ?
        if (cleanSql.includes('delete from files where file_id = ?')) {
          const fileId = params[0];
          const countBefore = self.data.files.length;
          self.data.files = self.data.files.filter(f => f.file_id !== fileId);
          self.save();
          return { changes: countBefore - self.data.files.length };
        }
        
        // ─── DELETE PROJECT ───
        // DELETE FROM projects WHERE project_id = ? AND user_id = ?
        if (cleanSql.includes('delete from projects where project_id = ? and user_id = ?')) {
          const [projectId, userId] = params;
          const countBefore = self.data.projects.length;
          self.data.projects = self.data.projects.filter(p => !(p.project_id === projectId && p.user_id === userId));
          self.save();
          return { changes: countBefore - self.data.projects.length };
        }
        
        // ─── VERSIONS ───
        // INSERT INTO versions (version_id, file_id, content) VALUES (?, ?, ?)
        if (cleanSql.includes('insert into versions')) {
          const [versionId, fileId, content] = params;
          self.data.versions.push({
            version_id: versionId,
            file_id: fileId,
            content,
            created_at: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // DELETE FROM versions WHERE file_id = ?
        if (cleanSql.includes('delete from versions where file_id = ?')) {
          const fileId = params[0];
          const countBefore = self.data.versions.length;
          self.data.versions = self.data.versions.filter(v => v.file_id !== fileId);
          self.save();
          return { changes: countBefore - self.data.versions.length };
        }
        
        // ─── AGENT TASKS ───
        // INSERT INTO agent_tasks (task_id, project_id, file_id, agent_type, input_data, status) VALUES (?, ?, ?, ?, ?, ?)
        if (cleanSql.includes('insert into agent_tasks')) {
          const [taskId, projectId, fileId, agentType, inputData, status] = params;
          self.data.agent_tasks.push({
            task_id: taskId,
            project_id: projectId,
            file_id: fileId,
            agent_type: agentType,
            input_data: inputData || '',
            status: status || 'running',
            result: '',
            created_at: new Date().toISOString(),
            completed_at: null
          });
          self.save();
          return { changes: 1 };
        }
        // UPDATE agent_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?
        if (cleanSql.includes('update agent_tasks set status = ?, result = ?, completed_at = current_timestamp where task_id = ?')) {
          const [status, result, taskId] = params;
          const t = self.data.agent_tasks.find(x => x.task_id === taskId);
          if (t) {
            t.status = status;
            t.result = result;
            t.completed_at = new Date().toISOString();
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }
        // UPDATE agent_tasks SET status = ? WHERE task_id = ?
        if (cleanSql.includes('update agent_tasks set status = ? where task_id = ?')) {
          const [status, taskId] = params;
          const t = self.data.agent_tasks.find(x => x.task_id === taskId);
          if (t) {
            t.status = status;
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }
        
        console.log(`⚠️ [Kiri DB] Unhandled RUN: "${sql}"`, params);
        return { changes: 0 };
      },
      
      all(...params) {
        // ─── PROJECTS LIST ───
        // SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC
        if (cleanSql.includes('select * from projects where user_id = ? order by created_at desc')) {
          const userId = params[0];
          return self.data.projects
            .filter(p => p.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        // ─── FILES LIST ───
        // SELECT * FROM files WHERE project_id = ? ORDER BY file_name
        if (cleanSql.includes('select * from files where project_id = ? order by file_name')) {
          const projectId = params[0];
          return self.data.files
            .filter(f => f.project_id === projectId)
            .sort((a, b) => a.file_name.localeCompare(b.file_name));
        }
        
        // ─── VERSIONS LIST ───
        // SELECT version_id, created_at FROM versions WHERE file_id = ? ORDER BY created_at DESC LIMIT 20
        if (cleanSql.includes('select version_id, created_at from versions where file_id = ?')) {
          const fileId = params[0];
          return self.data.versions
            .filter(v => v.file_id === fileId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20)
            .map(v => ({ version_id: v.version_id, created_at: v.created_at }));
        }
        
        // ─── AGENT TASKS LIST ───
        // SELECT task_id, agent_type, status, created_at, completed_at FROM agent_tasks ORDER BY created_at DESC LIMIT 50
        if (cleanSql.includes('select task_id, agent_type, status, created_at, completed_at from agent_tasks order by created_at desc')) {
          return self.data.agent_tasks
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50)
            .map(x => ({ task_id: x.task_id, agent_type: x.agent_type, status: x.status, created_at: x.created_at, completed_at: x.completed_at }));
        }
        
        // ─── SEARCH QUERIES ───
        // SELECT f.file_id, f.file_name, ... FROM files f JOIN projects p ON f.project_id = p.project_id WHERE ...
        if (cleanSql.includes('lower(f.file_content) like ?')) {
          const [userId, searchPattern] = params.length === 3 ? [params[0], params[2]] : [params[0], params[1]];
          const projectId = params.length === 3 ? params[1] : null;
          
          const cleanPattern = searchPattern.replace(/%/g, '').toLowerCase();
          
          let matchedFiles = self.data.files.filter(f => {
            const proj = self.data.projects.find(p => p.project_id === f.project_id);
            if (!proj || proj.user_id !== userId) return false;
            if (projectId && f.project_id !== projectId) return false;
            return f.file_content && f.file_content.toLowerCase().includes(cleanPattern);
          });
          
          return matchedFiles.slice(0, 20).map(f => {
            const proj = self.data.projects.find(p => p.project_id === f.project_id);
            return {
              file_id: f.file_id,
              file_name: f.file_name,
              project_id: f.project_id,
              project_name: proj ? proj.project_name : '',
              language: f.language,
              updated_at: f.updated_at,
              file_content: f.file_content
            };
          });
        }
        
        console.log(`⚠️ [Kiri DB] Unhandled ALL: "${sql}"`, params);
        return [];
      }
    };
  }
}

module.exports = new JSONDatabase();
