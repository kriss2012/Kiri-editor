import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AuthPage from './components/AuthPage';
import ProjectPicker from './components/ProjectPicker';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import AgentPanel from './components/AgentPanel';
import ChatOutput from './components/ChatOutput';
import StatusBar from './components/StatusBar';
import { AuthAPI, EditorAPI, AgentAPI } from './services/api';
import './index.css';

// ─── Constants ────────────────────────────────────────────
const SOCKET_URL = 'http://localhost/sync';

// ─── Helpers ──────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

let saveTimer = null;

// ─── App ──────────────────────────────────────────────────
export default function App() {
  // Auth state
  const [user, setUser]       = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // View state: 'projects' | 'editor'
  const [view, setView]       = useState('projects');

  // Project & file state
  const [project, setProject]   = useState(null);
  const [files, setFiles]       = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [openTabs, setOpenTabs]   = useState([]);

  // Editor local edits (unsaved)
  const [localContent, setLocalContent] = useState({});

  // Agent state
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentRunning, setAgentRunning]   = useState(false);
  const [messages, setMessages]           = useState([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);

  // WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef(null);

  // Modals
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // ── Auto-login from localStorage ────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('kiri_token');
    if (token) {
      AuthAPI.get('/health').then(() => {
        // token valid — try to restore user info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ userId: payload.userId, name: payload.name, email: payload.email });
        } catch {}
      }).catch(() => {
        localStorage.removeItem('kiri_token');
      }).finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  // ── WebSocket connection ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('file-updated', ({ fileId, content }) => {
      setLocalContent(prev => ({ ...prev, [fileId]: content }));
      setFiles(prev => prev.map(f => f.file_id === fileId ? { ...f, file_content: content } : f));
    });

    return () => { socket.disconnect(); };
  }, [user]);

  // ── Join project room ────────────────────────────────────
  useEffect(() => {
    if (project && socketRef.current) {
      socketRef.current.emit('join-project', project.project_id);
    }
  }, [project]);

  // ── Auth handlers ────────────────────────────────────────
  function handleAuth(userData) {
    setUser(userData);
    setView('projects');
  }

  function handleLogout() {
    localStorage.removeItem('kiri_token');
    setUser(null);
    setProject(null);
    setFiles([]);
    setOpenTabs([]);
    setActiveFileId(null);
    setView('projects');
    setMessages([]);
    if (socketRef.current) socketRef.current.disconnect();
  }

  // ── Project handlers ─────────────────────────────────────
  function handleOpenProject(projectData) {
    setProject(projectData);
    setFiles(projectData.files || []);
    setOpenTabs([]);
    setActiveFileId(null);
    setLocalContent({});
    setView('editor');

    // Auto-open first file
    if (projectData.files?.length > 0) {
      const first = projectData.files[0];
      setActiveFileId(first.file_id);
      setOpenTabs([first.file_id]);
    }
  }

  // ── File selection ────────────────────────────────────────
  function handleFileSelect(file) {
    setActiveFileId(file.file_id);
    setOpenTabs(prev => prev.includes(file.file_id) ? prev : [...prev, file.file_id]);
  }

  function handleTabClose(fileId) {
    setOpenTabs(prev => {
      const next = prev.filter(id => id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(next[next.length - 1] || null);
      }
      return next;
    });
  }

  // ── Content change (with auto-save debounce) ─────────────
  const handleContentChange = useCallback((fileId, value) => {
    // Update local content immediately
    setLocalContent(prev => ({ ...prev, [fileId]: value }));
    setFiles(prev => prev.map(f => f.file_id === fileId ? { ...f, file_content: value } : f));

    // Emit to socket for live collaboration
    if (project && socketRef.current) {
      socketRef.current.emit('file-edit', { projectId: project.project_id, fileId, content: value });
    }

    // Debounce server save (2s)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await EditorAPI.put(`/files/${fileId}`, { fileContent: value });
      } catch (err) {
        console.error('Auto-save failed:', err.message);
      }
    }, 2000);
  }, [project]);

  // ── New file ─────────────────────────────────────────────
  async function handleCreateFile(e) {
    e.preventDefault();
    if (!newFileName.trim() || !project) return;
    try {
      const { data } = await EditorAPI.post('/files', {
        projectId: project.project_id,
        fileName: newFileName,
        fileContent: '',
        language: 'javascript'
      });
      const newFile = { file_id: data.fileId, file_name: newFileName, file_content: '', language: 'javascript', project_id: project.project_id };
      setFiles(prev => [...prev, newFile]);
      setOpenTabs(prev => [...prev, newFile.file_id]);
      setActiveFileId(newFile.file_id);
      setShowNewFileModal(false);
      setNewFileName('');
    } catch (err) { console.error(err); }
  }

  // ── Delete file ────────────────────────────────────────────
  async function handleDeleteFile(fileId) {
    if (!confirm('Delete this file?')) return;
    await EditorAPI.delete(`/files/${fileId}`);
    setFiles(prev => prev.filter(f => f.file_id !== fileId));
    handleTabClose(fileId);
  }

  // ── Run agent (SSE streaming) ─────────────────────────────
  async function handleRunAgent() {
    if (!selectedAgent || !activeFileId || agentRunning) return;

    const activeFile = files.find(f => f.file_id === activeFileId);
    if (!activeFile) return;

    const msgId = `${Date.now()}-${selectedAgent}`;
    const newMsg = {
      id: msgId,
      agentType: selectedAgent,
      content: '',
      time: getTime(),
      streaming: true
    };

    setMessages(prev => [...prev, newMsg]);
    setAgentRunning(true);

    try {
      const token = localStorage.getItem('kiri_token');
      const response = await fetch('http://localhost:3003/api/agents/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentType: selectedAgent,
          fileId: activeFileId,
          projectId: project?.project_id,
          inputData: activeFile.file_content
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.type === 'chunk') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: m.content + evt.content } : m
              ));
            } else if (evt.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, streaming: false } : m
              ));
              setTasksCompleted(n => n + 1);
              if (socketRef.current && project) {
                socketRef.current.emit('agent-done', { projectId: project.project_id, taskId: evt.taskId });
              }
            } else if (evt.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: m.content + `\n\n**Error:** ${evt.message}`, streaming: false } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, content: `**Error:** ${err.message}`, streaming: false } : m
      ));
    } finally {
      setAgentRunning(false);
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (!authChecked) return null;

  if (!user) return <AuthPage onAuth={handleAuth} />;

  if (view === 'projects') {
    return (
      <ProjectPicker
        user={user}
        onOpenProject={handleOpenProject}
        onLogout={handleLogout}
      />
    );
  }

  const activeFile = files.find(f => f.file_id === activeFileId) || null;

  return (
    <div className="app-shell">
      {/* Title bar */}
      <div className="titlebar">
        <div className="titlebar-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">Kiri</span>
          <span className="logo-sub">Editor</span>
        </div>
        <div className="titlebar-spacer" />
        <div className="titlebar-info">
          <div className={`ws-dot ${wsConnected ? 'connected' : ''}`} />
          <span>{wsConnected ? 'Live' : 'Offline'}</span>
          <span style={{ margin: '0 4px', color: 'var(--border-bright)' }}>|</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setView('projects')}>
            ← Projects
          </span>
          <span style={{ margin: '0 4px', color: 'var(--border-bright)' }}>|</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={handleLogout}>Sign Out</span>
        </div>
      </div>

      {/* Main body */}
      <div className="app-body">
        {/* Left: File Explorer */}
        <FileExplorer
          project={project}
          files={files}
          activeFileId={activeFileId}
          onFileSelect={handleFileSelect}
          onNewFile={() => setShowNewFileModal(true)}
          onDeleteFile={handleDeleteFile}
          onNewProject={() => setView('projects')}
          onOpenProjects={() => setView('projects')}
        />

        {/* Center: Monaco Editor */}
        <Editor
          openTabs={openTabs}
          activeFileId={activeFileId}
          onTabSelect={setActiveFileId}
          onTabClose={handleTabClose}
          onContentChange={handleContentChange}
          files={files}
        />

        {/* Right: Agent Panel + Chat Output */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 'var(--agent-width)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          <AgentPanel
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            onRunAgent={handleRunAgent}
            running={agentRunning}
            activeFile={activeFile}
          />
          <ChatOutput
            messages={messages}
            onClear={() => setMessages([])}
          />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        connected={wsConnected}
        activeFile={activeFile}
        project={project}
        user={user}
        agentRunning={agentRunning}
        tasksCompleted={tasksCompleted}
      />

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create New File</h3>
            <form onSubmit={handleCreateFile}>
              <div className="form-group">
                <label className="form-label">File Name</label>
                <input
                  id="new-file-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. utils.js, server.py, README.md"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewFileModal(false)}>Cancel</button>
                <button id="btn-create-file" type="submit" className="btn btn-primary">Create File</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
