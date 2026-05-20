import React, { useEffect, useRef, useState } from 'react';

export default function TerminalPanel({ logs, onClear, isOpen, onClose, onRunCommand }) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Focus input on panel open or clicking the terminal body
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cmd = command.trim();
    if (!cmd || isRunning) return;

    setIsRunning(true);
    setCommand('');
    setCmdHistory(prev => [cmd, ...prev]);
    setHistoryIdx(-1);

    if (onRunCommand) {
      await onRunCommand(cmd);
    }
    setIsRunning(false);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setCommand(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      if (nextIdx < 0) {
        setCommand('');
      } else {
        setCommand(cmdHistory[nextIdx]);
      }
    }
  };

  const [activeTab, setActiveTab] = useState('TERMINAL');

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {['TERMINAL', 'OUTPUT', 'DEBUG CONSOLE'].map(tab => (
            <div 
              key={tab}
              className={`terminal-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ cursor: 'pointer' }}
            >
              {tab}
            </div>
          ))}
        </div>
        <div className="terminal-actions" style={{ display: 'flex', gap: 6 }}>
          <button className="terminal-btn" onClick={onClear} title="Clear Terminal" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            🧹
          </button>
          <button className="terminal-btn" onClick={onClose} title="Close Terminal" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            ✕
          </button>
        </div>
      </div>
      
      <div 
        className="terminal-body" 
        ref={scrollRef} 
        onClick={() => activeTab === 'TERMINAL' && inputRef.current && inputRef.current.focus()}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}
      >
        {activeTab === 'TERMINAL' && (
          <>
            <div className="terminal-logs-wrapper" style={{ flex: 1 }}>
              {logs.length === 0 ? (
                <div className="terminal-empty">Ready for system logs and shell commands...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`terminal-line ${log.type}`}>
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`log-badge badge-${log.type}`}>{log.type}</span>
                    <span className="log-source">[{log.source}]</span>
                    <span className="log-content" style={{ whiteSpace: 'pre-wrap' }}>{log.content}</span>
                  </div>
                ))
              )}
            </div>

            {/* Dynamic Interactive CLI Input */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border)', padding: '6px 12px', marginTop: 8 }}>
              <span style={{ color: 'var(--accent-hover)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                placeholder={isRunning ? 'Executing job...' : 'Type a command (e.g. dir, node -v, git status) and hit Enter...'}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  caretColor: 'var(--accent)'
                }}
              />
              {isRunning && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 10, height: 10 }}></span> Running
                </span>
              )}
            </form>
          </>
        )}

        {activeTab === 'OUTPUT' && (
          <div className="terminal-logs-wrapper" style={{ flex: 1 }}>
            <div className="terminal-empty">Output console is active. Build and application logs will appear here.</div>
          </div>
        )}

        {activeTab === 'DEBUG CONSOLE' && (
          <div className="terminal-logs-wrapper" style={{ flex: 1 }}>
            <div className="terminal-empty">Debug Console is active. Connected to Kiri Agent debugger.</div>
          </div>
        )}
      </div>
    </div>
  );
}
