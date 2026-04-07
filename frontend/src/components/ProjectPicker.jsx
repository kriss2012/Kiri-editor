import React, { useState, useEffect } from 'react';
import { EditorAPI } from '../services/api';

export default function ProjectPicker({ user, onOpenProject, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

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
      // Auto-open the new project
      const { data: full } = await EditorAPI.get(`/projects/${data.projectId}`);
      onOpenProject(full);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(e, projectId) {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    await EditorAPI.delete(`/projects/${projectId}`);
    fetchProjects();
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="project-page">
      <div className="project-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <div className="logo-icon-premium" style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: 18, boxShadow: 'var(--shadow-glow)'
            }}>⚡</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Kiri <span style={{ color: 'var(--accent-hover)' }}>Editor</span></h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Control Center</span>
            </div>
          </div>
        </div>
        <div className="project-header-actions">
          <button id="btn-new-project-header" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span style={{ marginRight: 6 }}>+</span> Create Project
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
          <button id="btn-logout" className="btn btn-ghost" onClick={onLogout} style={{ border: 'none' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 700, marginBottom: 24, padding: '0 4px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>. Continued working on your projects or start a new one.
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading projects...</div>
      ) : (
        <div className="projects-grid">
          <div className="new-project-card" onClick={() => setShowModal(true)}>
            <div style={{ fontSize: 28 }}>+</div>
            <div style={{ fontWeight: 600 }}>New Project</div>
          </div>

          {projects.map(p => (
            <div
              key={p.project_id}
              id={`project-${p.project_id}`}
              className="project-card"
              onClick={async () => {
                const { data } = await EditorAPI.get(`/projects/${p.project_id}`);
                onOpenProject(data);
              }}
            >
              <div className="project-card-icon" style={{ fontSize: 20 }}>📦</div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.project_name}</h3>
              <p style={{ height: 32, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.description || 'No description provided for this project.'}
              </p>
              
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {formatDate(p.created_at)}
                </span>
                <button
                  className="delete-btn-subtle"
                  style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px',
                    transition: 'color 0.2s',
                    fontFamily: 'var(--font-ui)'
                  }}
                  onClick={e => deleteProject(e, p.project_id)}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  id="new-project-name"
                  className="form-input"
                  type="text"
                  placeholder="My Awesome Project"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  id="new-project-desc"
                  className="form-input"
                  type="text"
                  placeholder="What's this project about?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="btn-create-project" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
