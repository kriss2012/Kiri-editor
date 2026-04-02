import React, { useState, useEffect } from 'react';
import API from '../services/api';

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
      const { data } = await API.get('/projects');
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
      const { data } = await API.post('/projects', { projectName: newName, description: newDesc });
      setShowModal(false);
      setNewName(''); setNewDesc('');
      await fetchProjects();
      // Auto-open the new project
      const { data: full } = await API.get(`/projects/${data.projectId}`);
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
    await API.delete(`/projects/${projectId}`);
    fetchProjects();
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="project-page">
      <div className="project-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
            }}>⚡</div>
            <h2>Kiri Editor</h2>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 44 }}>
            Welcome, {user.name} — choose a project to open
          </p>
        </div>
        <div className="project-header-actions">
          <button id="btn-new-project-header" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
          <button id="btn-logout" className="btn btn-ghost" onClick={onLogout}>Sign Out</button>
        </div>
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
                const { data } = await API.get(`/projects/${p.project_id}`);
                onOpenProject(data);
              }}
            >
              <div className="project-card-icon">📁</div>
              <h3>{p.project_name}</h3>
              <p>{p.description || 'No description'}</p>
              <p style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                Created {formatDate(p.created_at)}
              </p>
              <button
                style={{
                  marginTop: 10, fontSize: 10, color: 'var(--error)',
                  background: 'none', border: '1px solid transparent',
                  borderRadius: 4, cursor: 'pointer', padding: '2px 6px',
                  fontFamily: 'var(--font-ui)'
                }}
                onClick={e => deleteProject(e, p.project_id)}
              >Delete</button>
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
