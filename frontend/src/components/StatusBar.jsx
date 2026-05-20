import React from 'react';

function getLanguageLabel(lang) {
  const map = { javascript: 'JS', typescript: 'TS', python: 'PY', markdown: 'MD', json: 'JSON', css: 'CSS', html: 'HTML', sql: 'SQL' };
  return map[lang] || (lang ? lang.toUpperCase() : 'TEXT');
}

export default function StatusBar({ connected, activeFile, project, user, agentRunning, tasksCompleted }) {
  return (
    <div className="status-bar" id="status-bar" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: 'var(--bg-darkest)', borderTop: '1px solid var(--border)' }}>
      <div className="status-item">
        <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>[SYS]</span>
        <span style={{ color: 'var(--text-primary)' }}>KIRI_SEC_OS v1.0.0</span>
      </div>
      <div className="status-sep" />
      <div className="status-item">
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: connected ? 'var(--accent)' : 'var(--error)',
          display: 'inline-block',
          boxShadow: connected ? '0 0 6px var(--accent)' : '0 0 6px var(--error)',
          marginRight: 4
        }} />
        <span>{connected ? 'SYNC_UP' : 'SYNC_DOWN'}</span>
      </div>
      <div className="status-sep" />
      {project && (
        <>
          <div className="status-item">
            <span style={{ color: 'var(--text-secondary)' }}>WORK_DIR:</span>
            <span>{project.project_name.toUpperCase()}</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {activeFile && (
        <>
          <div className="status-item">
            <span style={{ color: 'var(--text-secondary)' }}>FILE:</span>
            <span>{activeFile.file_name}</span>
          </div>
          <div className="status-sep" />
          <div className="status-item">
            <span style={{ color: 'var(--text-secondary)' }}>LANG:</span>
            <span>{getLanguageLabel(activeFile.language)}</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      <div className="status-spacer" />
      {agentRunning && (
        <>
          <div className="status-item blink" style={{ color: 'var(--accent)' }}>
            <span>[~] AGENT_ACTIVE_PROCESSING</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {tasksCompleted > 0 && (
        <>
          <div className="status-item">
            <span>JOBS: {tasksCompleted} OK</span>
          </div>
          <div className="status-sep" />
        </>
      )}
      {user && (
        <div className="status-item" style={{ color: 'var(--text-secondary)' }}>
          <span>PRIV: ROOT@{user.name.replace(/\s+/g, '_').toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
