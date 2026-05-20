import React, { useState, useEffect } from 'react';
import { EditorAPI } from '../services/api';
import kiriAgentLogo from '../assets/kiri_agent_logo.png';

export default function ProjectPicker({ user, onOpenProject, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Local folder import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const { data } = await EditorAPI.get('/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await EditorAPI.post('/projects', { projectName: newName, description: newDesc });
      setShowModal(false);
      setNewName(''); setNewDesc('');
      await fetchProjects();
      const { data: full } = await EditorAPI.get(`/projects/${data.projectId}`);
      onOpenProject(full);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleImportFolder(e) {
    e.preventDefault();
    if (!importPath.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const { data } = await EditorAPI.post('/projects/import-local', { folderPath: importPath });
      setShowImportModal(false);
      setImportPath('');
      await fetchProjects();
      const { data: full } = await EditorAPI.get(`/projects/${data.projectId}`);
      onOpenProject(full);
    } catch (err) {
      setImportError(err.response?.data?.error || err.message);
    } finally {
      setImporting(false);
    }
  }

  async function deleteProject(e, projectId) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workspace and close its link?')) return;
    await EditorAPI.delete(`/projects/${projectId}`);
    fetchProjects();
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="project-page hacker-theme">
      {/* Kali scanlines style background layer */}
      <div className="cyber-grid-overlay" />
      
      <div className="project-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <div className="logo-dragon-glow">💀</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                KIRI-SEC<span style={{ color: 'var(--accent)' }}>//OS</span>
              </h2>
              <span className="cyber-glitch-text" style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '2px' }}>
                ACCESS: LEVEL_ROOT_PRIVILEGE
              </span>
            </div>
          </div>
        </div>
        
        <div className="project-header-actions">
          <button id="btn-new-project-header" className="btn btn-primary cyber-btn" onClick={() => setShowModal(true)}>
            [+] NEW PROJECT
          </button>
          <button className="btn btn-ghost cyber-btn green" onClick={() => setShowImportModal(true)}>
            [📂] OPEN LOCAL FOLDER
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
          <button id="btn-logout" className="btn btn-ghost cyber-btn red" onClick={onLogout}>SIGN_OUT</button>
        </div>
      </div>

      {/* Cyber Diagnostics Banner */}
      <div className="cyber-diagnostics-banner">
        <div className="diag-item"><span className="diag-tag">TARGET:</span> <span className="diag-val">127.0.0.1</span></div>
        <div className="diag-item"><span className="diag-tag">USER:</span> <span className="diag-val">{user.name.toUpperCase()}@KIRI-KALI</span></div>
        <div className="diag-item"><span className="diag-tag">EXPLOIT:</span> <span className="diag-val status-ok">ACTIVE</span></div>
        <div className="diag-item"><span className="diag-tag">SECURE_SHELL:</span> <span className="diag-val status-ok">ESTABLISHED</span></div>
      </div>

      <div style={{ width: '100%', maxWidth: 700, marginBottom: 24, padding: '0 4px', position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          $ ls -la workspaces/
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)' }} className="blink">
          [~] Scanning local storage filesystems...
        </div>
      ) : (
        <div className="projects-grid">
          <div className="new-project-card cyber-card" onClick={() => setShowModal(true)}>
            <div style={{ fontSize: 24, color: 'var(--accent)' }}>[ + ]</div>
            <div style={{ fontWeight: 600, letterSpacing: '1px' }}>CREATE_PROJECT</div>
          </div>
          
          <div className="new-project-card cyber-card-alt" onClick={() => setShowImportModal(true)}>
            <div style={{ fontSize: 24, color: 'var(--text-secondary)' }}>[ 📂 ]</div>
            <div style={{ fontWeight: 600, letterSpacing: '1px' }}>IMPORT_LOCAL_DIR</div>
          </div>

          {projects.map(p => (
            <div
              key={p.project_id}
              id={`project-${p.project_id}`}
              className="project-card cyber-card-loaded"
              onClick={async () => {
                const { data } = await EditorAPI.get(`/projects/${p.project_id}`);
                onOpenProject(data);
              }}
            >
              <div className="cyber-card-header">
                <span className="card-dot-green">●</span>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', opacity: 0.6 }}>ID: {p.project_id.substring(0,8)}</span>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 6px', fontFamily: 'var(--font-mono)' }}>
                {p.project_name.toUpperCase()}
              </h3>
              <p style={{ height: 32, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: 11 }}>
                {p.description || 'No database configuration path set.'}
              </p>
              
              {p.custom_path && (
                <div className="custom-path-badge">
                  {p.custom_path}
                </div>
              )}
              
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  DT: {formatDate(p.created_at)}
                </span>
                <button
                  className="cyber-delete-btn"
                  onClick={e => deleteProject(e, p.project_id)}
                >
                  [REMOVE]
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal cyber-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              # CREATE NEW SYSTEM TARGET
            </h3>
            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="form-label">WORKSPACE NAME</label>
                <input
                  id="new-project-name"
                  className="form-input cyber-input"
                  type="text"
                  placeholder="e.g. malware-db"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">SYSTEM METADATA</label>
                <input
                  id="new-project-desc"
                  className="form-input cyber-input"
                  type="text"
                  placeholder="e.g. development testing node server"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost cyber-btn red" onClick={() => setShowModal(false)}>CANCEL</button>
                <button id="btn-create-project" type="submit" className="btn btn-primary cyber-btn" disabled={creating}>
                  {creating ? 'PROVISIONING...' : 'PROVISION_TARGET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Local Folder Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal cyber-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              # IMPORT LOCAL FILE SYSTEM WORKSPACE
            </h3>
            <form onSubmit={handleImportFolder}>
              <div className="form-group">
                <label className="form-label">ABSOLUTE DIRECTORY PATH</label>
                <input
                  className="form-input cyber-input"
                  type="text"
                  placeholder="e.g. C:/Users/krishna/projects/my-web-app"
                  value={importPath}
                  onChange={e => setImportPath(e.target.value)}
                  autoFocus
                  required
                />
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Provide the absolute path to sync files on your local drive directly.
                </span>
              </div>
              
              {importError && (
                <div className="auth-error" style={{ fontSize: 11, padding: 6, margin: '8px 0 0 0' }}>
                  [ERR] {importError}
                </div>
              )}
              
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost cyber-btn red" onClick={() => setShowImportModal(false)}>CANCEL</button>
                <button type="submit" className="btn btn-primary cyber-btn" disabled={importing}>
                  {importing ? 'SYNCING...' : 'MOUNT_DIRECTORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
