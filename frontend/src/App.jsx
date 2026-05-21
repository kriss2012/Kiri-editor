import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AuthPage from './components/AuthPage';
import ProjectPicker from './components/ProjectPicker';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import AgentPanel from './components/AgentPanel';
import ChatOutput from './components/ChatOutput';
import StatusBar from './components/StatusBar';
import TerminalPanel from './components/TerminalPanel';
import SearchPanel from './components/SearchPanel';
import { AuthAPI, EditorAPI, AgentAPI, SearchAPI, TerminalAPI } from './services/api';
import kiriAgentLogo from './assets/kiri_agent_logo.png';
import './index.css';

// ─── Constants ────────────────────────────────────────────
const BACKEND_URL = typeof window !== 'undefined' && window.location.origin
  ? (window.location.port === '5173' ? 'http://localhost:4000' : window.location.origin)
  : 'http://localhost:4000';

const SOCKET_URL = typeof window !== 'undefined' && window.location.origin
  ? (window.location.port === '5173' || window.location.port === '4000' ? 'http://localhost:4000' : window.location.origin + '/sync')
  : 'http://localhost:4000';

// ─── Helpers ──────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

let saveTimer = null;

// ─── App ──────────────────────────────────────────────────
export default function App() {
  // Auth state - Hardcoded to offline local user to completely skip login screen
  const [user, setUser]       = useState({ userId: 'local', name: 'Local User', email: 'local@kirieditor.com' });
  const [authChecked, setAuthChecked] = useState(true);

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
  const [agentEditingFile, setAgentEditingFile] = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);

  // WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef(null);

  // Modals
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [showTerminal, setShowTerminal] = useState(true);

  // Sidebar view state: 'explorer' | 'search'
  const [sidebarView, setSidebarView] = useState('explorer');

  // Right sidebar view state
  const [showAgentPanel, setShowAgentPanel] = useState(true);

  // ── Logging Helper ──────────────────────────────────────
  const logSystem = useCallback((content, type = 'info', source = 'system') => {
    setTerminalLogs(prev => [...prev, {
      timestamp: Date.now(),
      content,
      type,
      source
    }]);
  }, []);

  // ── Auto-login for Local Offline Usage ──────────────────
  useEffect(() => {
    setUser({ userId: 'local', name: 'Local User', email: 'local@kirieditor.com' });
    setAuthChecked(true);
  }, []);

  // ── WebSocket connection ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      logSystem('Connected to Real-time Sync Service', 'success', 'network');
    });
    socket.on('disconnect', () => {
      setWsConnected(false);
      logSystem('Disconnected from Real-time Sync Service', 'warn', 'network');
    });

    socket.on('file-updated', ({ fileId, content }) => {
      setLocalContent(prev => ({ ...prev, [fileId]: content }));
      setFiles(prev => prev.map(f => f.file_id === fileId ? { ...f, file_content: content } : f));
      logSystem(`Remote update received for file ${fileId}`, 'info', 'sync');
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
    setUser(null);
    setProject(null);
    setFiles([]);
    setOpenTabs([]);
    setActiveFileId(null);
    setView('projects');
    setMessages([]);
    if (socketRef.current) socketRef.current.disconnect();
    
    // Quickly login again to stay in offline mode, bypassing auth screen
    setTimeout(() => {
        setUser({ userId: 'local', name: 'Local User', email: 'local@kirieditor.com' });
    }, 100);
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
      setTimeout(() => handleFileSelect(first), 10);
    }
  }

  // ── File selection ────────────────────────────────────────
  async function handleFileSelect(file) {
    setActiveFileId(file.file_id);
    setOpenTabs(prev => prev.includes(file.file_id) ? prev : [...prev, file.file_id]);
    
    // Fetch file content dynamically if it is empty and we haven't loaded it locally
    setLocalContent(prev => {
      if (prev[file.file_id] === undefined && !file.file_content) {
        EditorAPI.get(`/files/${file.file_id}`).then(({ data }) => {
          setLocalContent(l => ({ ...l, [file.file_id]: data.file_content }));
          setFiles(f => f.map(x => x.file_id === file.file_id ? { ...x, file_content: data.file_content } : x));
        }).catch(e => console.error("Failed to load file content", e));
      }
      return prev;
    });
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
        logSystem(`Auto-saved ${files.find(f => f.file_id === fileId)?.file_name}`, 'success', 'editor');
      } catch (err) {
        console.error('Auto-save failed:', err.message);
        logSystem(`Save failed: ${err.message}`, 'error', 'editor');
      }
    }, 2000);
  }, [project]);

  // ── Agent Changes Handlers ───────────────────────────────
  const handleAcceptAgentChanges = useCallback(async () => {
    if (!agentEditingFile) return;
    const { fileId, newContent } = agentEditingFile;
    try {
      await EditorAPI.put(`/files/${fileId}`, { fileContent: newContent });
      logSystem(`Agent changes accepted and saved!`, 'success', 'agent');
    } catch (err) {
      logSystem(`Failed to save agent changes: ${err.message}`, 'error', 'agent');
    } finally {
      setAgentEditingFile(null);
    }
  }, [agentEditingFile, logSystem]);

  const handleDiscardAgentChanges = useCallback(async () => {
    if (!agentEditingFile) return;
    const { fileId, originalContent } = agentEditingFile;
    setLocalContent(prev => ({ ...prev, [fileId]: originalContent }));
    setFiles(prev => prev.map(f => f.file_id === fileId ? { ...f, file_content: originalContent } : f));
    try {
      await EditorAPI.put(`/files/${fileId}`, { fileContent: originalContent });
      logSystem(`Agent changes discarded and reverted!`, 'warn', 'agent');
    } catch (err) {
      console.error('Failed to revert:', err.message);
    } finally {
      setAgentEditingFile(null);
    }
  }, [agentEditingFile, logSystem]);

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
  async function handleRunAgent(prompt) {
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
    logSystem(`Started ${selectedAgent} for ${activeFile.file_name}`, 'info', 'agent');

    try {
      const token = localStorage.getItem('kiri_token');
      const response = await fetch(`${BACKEND_URL}/api/agents/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentType: selectedAgent,
          fileId: activeFileId,
          projectId: project?.project_id,
          inputData: activeFile.file_content,
          prompt: prompt
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
            } else if (evt.type === 'code-start') {
              if (selectedAgent === 'test') {
                const testFileName = `${activeFile.file_name.split('.')[0]}.test.js`;
                const fileCreateResponse = await fetch(`${BACKEND_URL}/api/files`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    projectId: project.project_id,
                    fileName: testFileName,
                    fileContent: '// Generating Jest test suite...',
                    language: 'javascript'
                  })
                });
                const newFileData = await fileCreateResponse.json();
                
                const newFile = {
                  file_id: newFileData.fileId,
                  file_name: newFileData.fileName,
                  file_content: newFileData.fileContent,
                  language: newFileData.language,
                  project_id: newFileData.projectId
                };
                
                setFiles(prev => [...prev, newFile]);
                setActiveFileId(newFile.file_id);
                setOpenTabs(prev => prev.includes(newFile.file_id) ? prev : [...prev, newFile.file_id]);
                
                setAgentEditingFile({
                  fileId: newFile.file_id,
                  originalContent: '',
                  newContent: '',
                  active: true
                });
              } else if (selectedAgent === 'code' || selectedAgent === 'documentation' || selectedAgent === 'debug') {
                setAgentEditingFile({
                  fileId: activeFileId,
                  originalContent: activeFile.file_content,
                  newContent: '',
                  active: true
                });
              }
            } else if (evt.type === 'files-updated') {
              const updatedFiles = evt.files || [];
              
              setFiles(currentFiles => {
                const newFilesList = [...currentFiles];
                updatedFiles.forEach(uf => {
                  const existingIdx = newFilesList.findIndex(f => f.file_name === uf.file_name);
                  if (existingIdx >= 0) {
                    newFilesList[existingIdx] = { ...newFilesList[existingIdx], file_content: uf.file_content, file_id: uf.file_id };
                  } else {
                    newFilesList.push({
                      file_id: uf.file_id,
                      project_id: project.project_id,
                      file_name: uf.file_name,
                      file_content: uf.file_content,
                      language: uf.file_name.split('.').pop() || 'text'
                    });
                  }
                });
                return newFilesList;
              });

              setLocalContent(l => {
                const newLocal = { ...l };
                updatedFiles.forEach(uf => {
                  newLocal[uf.file_id] = uf.file_content;
                });
                return newLocal;
              });
              
              if (updatedFiles.length > 0) {
                 const firstFileId = updatedFiles[0].file_id;
                 setActiveFileId(firstFileId);
                 setOpenTabs(prev => prev.includes(firstFileId) ? prev : [...prev, firstFileId]);
              }
            } else if (evt.type === 'preview-ready') {
              setPreviewUrl(evt.url);
              logSystem(`Live preview ready: ${evt.url}`, 'success', 'agent');
            } else if (evt.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, streaming: false } : m
              ));
              setTasksCompleted(n => n + 1);
              if (socketRef.current && project) {
                socketRef.current.emit('agent-done', { projectId: project.project_id, taskId: evt.taskId });
              }
              logSystem(`Agent task completed successfully`, 'success', 'agent');
            } else if (evt.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: m.content + `\n\n**Error:** ${evt.message}`, streaming: false } : m
              ));
              logSystem(`Agent error: ${evt.message}`, 'error', 'agent');
            }
          } catch (e) {
            console.error('SSE JSON error:', e);
          }
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

  // ── Vibe Code — full app generation from one command ──────
  async function handleVibeCode(prompt) {
    if (!project || agentRunning) return;

    const msgId = `${Date.now()}-vibe`;
    setMessages(prev => [...prev, {
      id: msgId,
      agentType: 'vibe',
      content: '',
      time: getTime(),
      streaming: true
    }]);
    setAgentRunning(true);
    setPreviewUrl(null);
    logSystem(`🚀 Vibe coding: "${prompt}"`, 'info', 'agent');

    try {
      const token = localStorage.getItem('kiri_token');
      const response = await fetch(`${BACKEND_URL}/api/agents/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'vibe',
          projectId: project.project_id,
          prompt
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
            } else if (evt.type === 'files-updated') {
              const updatedFiles = evt.files || [];
              setFiles(currentFiles => {
                const newList = [...currentFiles];
                updatedFiles.forEach(uf => {
                  const idx = newList.findIndex(f => f.file_name === uf.file_name);
                  if (idx >= 0) {
                    newList[idx] = { ...newList[idx], file_content: uf.file_content, file_id: uf.file_id };
                  } else {
                    newList.push({
                      file_id: uf.file_id,
                      project_id: project.project_id,
                      file_name: uf.file_name,
                      file_content: uf.file_content,
                      language: uf.file_name.split('.').pop() || 'text'
                    });
                  }
                });
                return newList;
              });
              setLocalContent(l => {
                const next = { ...l };
                updatedFiles.forEach(uf => { next[uf.file_id] = uf.file_content; });
                return next;
              });
              if (updatedFiles.length > 0) {
                const firstId = updatedFiles[0].file_id;
                setActiveFileId(firstId);
                setOpenTabs(prev => prev.includes(firstId) ? prev : [...prev, firstId]);
              }
              logSystem(`✅ ${updatedFiles.length} file(s) generated`, 'success', 'agent');
            } else if (evt.type === 'preview-ready') {
              setPreviewUrl(evt.url);
              logSystem(`🌐 Live preview: ${evt.url}`, 'success', 'agent');
            } else if (evt.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, streaming: false } : m
              ));
              setTasksCompleted(n => n + 1);
              logSystem('🎉 Vibe coding complete!', 'success', 'agent');
            } else if (evt.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === msgId
                  ? { ...m, content: m.content + `\n\n**Error:** ${evt.message}`, streaming: false }
                  : m
              ));
              logSystem(`Vibe error: ${evt.message}`, 'error', 'agent');
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, content: `**Error:** ${err.message}`, streaming: false } : m
      ));
      logSystem(`Vibe failed: ${err.message}`, 'error', 'agent');
    } finally {
      setAgentRunning(false);
    }
  }

  // ── Run CLI command in Terminal ──────────────────────────

  const handleRunCommand = useCallback(async (cmd) => {
    logSystem(cmd, 'info', 'cli');
    try {
      const { data } = await TerminalAPI.post('/run', {
        command: cmd,
        projectId: project ? project.project_id : null
      });
      if (data.stdout && data.stdout.trim()) {
        logSystem(data.stdout.trim(), 'success', 'cli');
      }
      if (data.stderr && data.stderr.trim()) {
        logSystem(data.stderr.trim(), 'error', 'cli');
      }
      if (data.exitCode !== 0) {
        logSystem(`Command failed with exit code ${data.exitCode}`, 'error', 'cli');
      }
    } catch (err) {
      logSystem(`Execution failed: ${err.response?.data?.error || err.message}`, 'error', 'cli');
    }
  }, [logSystem]);

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
          <img src={kiriAgentLogo} alt="Kiri Logo" style={{ width: 20, height: 20, marginRight: 8, borderRadius: 4, objectFit: 'contain' }} />
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
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowAgentPanel(!showAgentPanel)}>
            {showAgentPanel ? 'Close Agent' : 'Open Agent'}
          </span>
          <span style={{ margin: '0 4px', color: 'var(--border-bright)' }}>|</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={handleLogout}>Sign Out</span>
        </div>
      </div>

      {/* Main body */}
      <div className="app-body">
        {/* Left: Sidebar (File Explorer / Search) */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 'var(--sidebar-width)', borderRight: '1px solid var(--border)', background: 'var(--bg-dark)' }}>
          {/* Sidebar Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-darkest)' }}>
            <button 
              className={`icon-btn ${sidebarView === 'explorer' ? 'active' : ''}`} 
              onClick={() => setSidebarView('explorer')}
              style={{ flex: 1, height: 36, borderRadius: 0, borderBottom: sidebarView === 'explorer' ? '2px solid var(--accent)' : 'none' }}
              title="File Explorer"
            >
              📂
            </button>
            <button 
              className={`icon-btn ${sidebarView === 'search' ? 'active' : ''}`} 
              onClick={() => setSidebarView('search')}
              style={{ flex: 1, height: 36, borderRadius: 0, borderBottom: sidebarView === 'search' ? '2px solid var(--accent)' : 'none' }}
              title="Search"
            >
              🔍
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {sidebarView === 'explorer' ? (
              <FileExplorer
                project={project}
                files={files}
                activeFileId={activeFileId}
                onFileSelect={handleFileSelect}
                onNewFile={() => setShowNewFileModal(true)}
                onDeleteFile={handleDeleteFile}
                onNewProject={() => setView('projects')}
                onOpenProjects={() => setView('projects')}
                onPreviewProject={() => {
                  if (project) window.open(`${BACKEND_URL}/preview/${project.project_name}/`, '_blank');
                }}
              />
            ) : (
              <SearchPanel
                project={project}
                onFileSelect={(f) => {
                  setSidebarView('explorer');
                  handleFileSelect(f);
                }}
              />
            )}
          </div>
        </div>

        {/* Center: Monaco Editor + Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <Editor
            openTabs={openTabs}
            activeFileId={activeFileId}
            onTabSelect={setActiveFileId}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
            files={files}
          />
          {agentEditingFile && agentEditingFile.active && (
            <div className="agent-diff-bar">
              <div className="agent-diff-info">
                <span className="diff-robot-glow">🤖</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Kiri Agent: Suggested Changes Ready
                </span>
              </div>
              <div className="agent-diff-actions">
                <button className="diff-btn accept" onClick={handleAcceptAgentChanges}>Accept (Keep)</button>
                <button className="diff-btn discard" onClick={handleDiscardAgentChanges}>Discard</button>
              </div>
            </div>
          )}
          <TerminalPanel 
            logs={terminalLogs} 
            isOpen={showTerminal} 
            onClose={() => setShowTerminal(false)}
            onClear={() => setTerminalLogs([])}
            onRunCommand={handleRunCommand}
          />
        </div>

        {/* Right: Agent Panel + Chat Output */}
        {showAgentPanel && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 'var(--agent-width)', height: '100%', minHeight: 0, borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
            <ChatOutput
              messages={messages}
              onClear={() => setMessages([])}
            />
            <AgentPanel
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
              onRunAgent={handleRunAgent}
              onVibeCode={handleVibeCode}
              running={agentRunning}
              activeFile={activeFile}
              previewUrl={previewUrl}
              onOpenPreview={(url) => window.open(url, '_blank')}
            />
          </div>
        )}
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
