import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >AI Agents</motion.span>
        <span style={{ fontSize: 9, color: running ? 'var(--accent)' : 'var(--text-muted)' }}>
          {running ? (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >● RUNNING</motion.div>
          ) : '○ IDLE'}
        </span>
      </div>

      <motion.div 
        className="agent-grid"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
      >
        {AGENTS.map(agent => (
          <motion.div
            key={agent.type}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            id={`agent-${agent.type}`}
            className={`agent-card ${selectedAgent === agent.type ? 'active' : ''} ${running && selectedAgent === agent.type ? 'running' : ''}`}
            onClick={() => !running && onSelectAgent(agent.type)}
            title={`${agent.name} Agent`}
            style={{ position: 'relative' }}
          >
            {running && selectedAgent === agent.type && (
               <motion.div 
                 className="thinking-blob"
                 animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 style={{
                   position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                   background: agent.color, borderRadius: 'inherit', filter: 'blur(8px)', zIndex: -1
                 }}
               />
            )}
            <div className="agent-icon">{agent.icon}</div>
            <div className="agent-name" style={{ color: agent.color }}>{agent.name}</div>
          </motion.div>
        ))}
      </motion.div>

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

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        id="btn-run-agent"
        className={`run-agent-btn ${running ? 'running' : ''}`}
        onClick={onRunAgent}
        disabled={!selectedAgent || !activeFile || running}
      >
        {running
          ? <><span className="spinner" /> Running...</>
          : <><span>▶</span> Run Agent</>
        }
      </motion.button>

      <div className="agent-divider" />
    </div>
  );
}
