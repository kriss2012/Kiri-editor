import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  { type: 'code',          icon: '⚡', name: 'Code Agent',          desc: 'Refactor, write, and complete code' },
  { type: 'explanation',   icon: '💡', name: 'Explanation Agent',   desc: 'Analyze logic, patterns, and codebases' },
  { type: 'documentation', icon: '📝', name: 'Docs Agent',          desc: 'Generate JSDoc, comments, and READMEs' },
  { type: 'search',        icon: '🔍', name: 'Search Agent',        desc: 'Query web search or database entries' },
  { type: 'debug',         icon: '🐛', name: 'Debug Agent',         desc: 'Locate syntax errors and patch bugs' },
  { type: 'test',          icon: '🧪', name: 'Test Agent',          desc: 'Write robust unit test suites' },
];

const VIBE_EXAMPLES = [
  'Build a stunning portfolio website with dark theme and animations',
  'Create a todo app with localStorage and drag & drop',
  'Make a weather dashboard with animated weather icons',
  'Build a calculator with glassmorphism design',
  'Create a landing page for a SaaS product',
  'Build a markdown editor with live preview',
  'Make a quiz game with score tracking',
  'Create an e-commerce product page',
];

export default function AgentPanel({
  selectedAgent, onSelectAgent,
  onRunAgent, onVibeCode,
  running, activeFile,
  previewUrl, onOpenPreview
}) {
  const [prompt, setPrompt] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState('vibe'); // 'vibe' | 'edit'
  const [exampleIdx, setExampleIdx] = useState(0);
  const dropdownRef = useRef(null);
  const textareaRef = useRef(null);

  // Rotate example placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setExampleIdx(i => (i + 1) % VIBE_EXAMPLES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Default agent initialization
  useEffect(() => {
    if (!selectedAgent) onSelectAgent('code');
  }, [selectedAgent, onSelectAgent]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || running) return;
    if (mode === 'vibe') {
      onVibeCode(prompt);
    } else {
      onRunAgent(prompt);
    }
    setPrompt('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const activeAgentMeta = AGENTS.find(a => a.type === selectedAgent) || AGENTS[0];

  return (
    <div className="agent-input-container">

      {/* Mode Toggle */}
      <div className="agent-mode-toggle">
        <button
          className={`mode-tab ${mode === 'vibe' ? 'active' : ''}`}
          onClick={() => setMode('vibe')}
          disabled={running}
          title="Generate a full app from one command"
        >
          <span>🚀</span>
          <span>VIBE</span>
        </button>
        <button
          className={`mode-tab ${mode === 'edit' ? 'active' : ''}`}
          onClick={() => setMode('edit')}
          disabled={running}
          title="Edit the active file with AI"
        >
          <span>✏️</span>
          <span>EDIT</span>
        </button>
      </div>

      {/* Preview Banner */}
      {previewUrl && (
        <motion.div
          className="preview-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>🌐 App ready!</span>
          <button
            className="preview-btn"
            onClick={() => onOpenPreview(previewUrl)}
          >
            Open Preview ↗
          </button>
        </motion.div>
      )}

      <form className="agent-input-form" onSubmit={handleSubmit}>

        {/* Mode-specific header */}
        {mode === 'vibe' ? (
          <div className="agent-vibe-header">
            <span className="vibe-bolt">⚡</span>
            <span className="vibe-label">Vibe Code — Build anything with one command</span>
          </div>
        ) : (
          <div className="agent-active-badge-bar">
            <span className="sparkle-icon">✨</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active:{' '}
              <span style={{ color: `var(--agent-${activeAgentMeta.type})` }}>
                {activeAgentMeta.name}
              </span>
              {activeFile && (
                <span style={{ opacity: 0.6, marginLeft: 4 }}>on {activeFile.file_name}</span>
              )}
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="agent-textarea"
          placeholder={
            mode === 'vibe'
              ? VIBE_EXAMPLES[exampleIdx]
              : `Ask the ${activeAgentMeta.name} anything about ${activeFile ? activeFile.file_name : 'this project'}...`
          }
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
          rows={Math.min(5, Math.max(2, prompt.split('\n').length))}
        />

        <div className="agent-input-footer" ref={dropdownRef}>

          {/* Edit mode: Agent selector */}
          {mode === 'edit' && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="agent-selector-btn"
                onClick={() => !running && setMenuOpen(!menuOpen)}
                disabled={running}
                style={{ borderColor: `var(--agent-${activeAgentMeta.type})` }}
              >
                <span>{activeAgentMeta.icon}</span>
                <span style={{ fontWeight: 500 }}>{activeAgentMeta.name.split(' ')[0]}</span>
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>▼</span>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="agent-menu-dropdown"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="agent-dropdown-header">Choose AI Specialization</div>
                    <div className="agent-dropdown-list">
                      {AGENTS.map(agent => (
                        <div
                          key={agent.type}
                          className={`agent-dropdown-item ${selectedAgent === agent.type ? 'active' : ''}`}
                          onClick={() => { onSelectAgent(agent.type); setMenuOpen(false); }}
                        >
                          <span className="agent-item-icon">{agent.icon}</span>
                          <div className="agent-item-details">
                            <div className="agent-item-name" style={{ color: `var(--agent-${agent.type})` }}>
                              {agent.name}
                            </div>
                            <div className="agent-item-desc">{agent.desc}</div>
                          </div>
                          {selectedAgent === agent.type && <span className="check-mark">✓</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Vibe mode: example chips */}
          {mode === 'vibe' && !running && (
            <div className="vibe-chip-row">
              <button type="button" className="vibe-chip" onClick={() => setPrompt('Build a landing page for a SaaS product with dark theme')}>
                landing page
              </button>
              <button type="button" className="vibe-chip" onClick={() => setPrompt('Create a todo app with beautiful UI and localStorage')}>
                todo app
              </button>
              <button type="button" className="vibe-chip" onClick={() => setPrompt('Build a portfolio website with animations')}>
                portfolio
              </button>
            </div>
          )}

          {/* Send button */}
          <button
            type="submit"
            className={`send-btn ${prompt.trim() && !running ? 'active' : ''} ${mode === 'vibe' ? 'vibe-send' : ''}`}
            disabled={!prompt.trim() || running}
            title={mode === 'vibe' ? 'Generate full app (Vibe Mode)' : 'Run agent on current file'}
          >
            {running ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : mode === 'vibe' ? (
              <span>⚡ Build</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
