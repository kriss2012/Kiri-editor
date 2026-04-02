import React from 'react';

function getLanguageLabel(lang) {
  const map = { javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', markdown: 'Markdown', json: 'JSON', css: 'CSS', html: 'HTML', sql: 'SQL' };
  return map[lang] || lang || 'Text';
}

export default function StatusBar({ connected, activeFile, project, user, agentRunning, tasksCompleted }) {
  return (
    <div className="status-bar" id="status-bar">
      <div className="status-item">
        <span>⚡</span>
        <span>Kiri Editor</span>
      </div>
      <div className="status-sep" />
      <div className="status-item">
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: connected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
          display: 'inline-block',
          boxShadow: connected ? '0 0 6px rgba(255,255,255,0.6)' : 'none'
        }} />
        <span>{connected ? 'WebSocket Connected' : 'Offline'}</span>
      </div>
      <div className="status-sep" />
      {project && (
        <>
          <div className="status-item">
            <span>📁</span>
            <span>{project.project_name}</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {activeFile && (
        <>
          <div className="status-item">
            <span>{activeFile.file_name}</span>
          </div>
          <div className="status-sep" />
          <div className="status-item">
            <span>{getLanguageLabel(activeFile.language)}</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      <div className="status-spacer" />
      {agentRunning && (
        <>
          <div className="status-item">
            <span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)', width: 10, height: 10 }} />
            <span>Agent running...</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {tasksCompleted > 0 && (
        <>
          <div className="status-item">
            <span>✓ {tasksCompleted} task{tasksCompleted !== 1 ? 's' : ''} done</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {user && (
        <div className="status-item">
          <span>👤</span>
          <span>{user.name}</span>
        </div>
      )}
    </div>
  );
}
