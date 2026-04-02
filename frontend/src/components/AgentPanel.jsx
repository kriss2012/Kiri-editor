import React from 'react';

const AGENTS = [
  { type: 'documentation', icon: '📝', name: 'Docs',    color: 'var(--agent-doc)' },
  { type: 'code',          icon: '⚡', name: 'Code',    color: 'var(--agent-code)' },
  { type: 'explanation',   icon: '💡', name: 'Explain', color: 'var(--agent-explain)' },
  { type: 'search',        icon: '🔍', name: 'Search',  color: 'var(--agent-search)' },
  { type: 'debug',         icon: '🐛', name: 'Debug',   color: 'var(--agent-debug)' },
  { type: 'test',          icon: '🧪', name: 'Test',    color: 'var(--agent-test)' },
];

export default function AgentPanel({ selectedAgent, onSelectAgent, onRunAgent, running, activeFile }) {
  return (
    <div className="agent-panel">
      <div className="panel-header">
        <span>AI Agents</span>
        <span style={{ fontSize: 9, color: running ? 'var(--accent)' : 'var(--text-muted)' }}>
          {running ? '● RUNNING' : '○ IDLE'}
        </span>
      </div>

      <div className="agent-grid">
        {AGENTS.map(agent => (
          <div
            key={agent.type}
            id={`agent-${agent.type}`}
            className={`agent-card ${selectedAgent === agent.type ? 'active' : ''} ${running && selectedAgent === agent.type ? 'running' : ''}`}
            onClick={() => !running && onSelectAgent(agent.type)}
            title={`${agent.name} Agent`}
          >
            <div className="agent-icon">{agent.icon}</div>
            <div className="agent-name" style={{ color: agent.color }}>{agent.name}</div>
          </div>
        ))}
      </div>

      <div className="agent-divider" />

      <div style={{ padding: '0 12px', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          {activeFile
            ? <>Target: <span style={{ color: 'var(--text-secondary)' }}>{activeFile.file_name}</span></>
            : 'No file selected'}
        </div>
        {selectedAgent && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
            Agent: <span style={{ color: AGENTS.find(a => a.type === selectedAgent)?.color }}>
              {AGENTS.find(a => a.type === selectedAgent)?.name}
            </span>
          </div>
        )}
      </div>

      <button
        id="btn-run-agent"
        className={`run-agent-btn ${running ? 'running' : ''}`}
        onClick={onRunAgent}
        disabled={!selectedAgent || !activeFile || running}
      >
        {running
          ? <><span className="spinner" /> Running...</>
          : <><span>▶</span> Run Agent</>
        }
      </button>

      <div className="agent-divider" />
    </div>
  );
}
