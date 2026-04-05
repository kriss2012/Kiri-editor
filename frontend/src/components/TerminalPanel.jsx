import React, { useEffect, useRef } from 'react';

export default function TerminalPanel({ logs, onClear, isOpen, onClose }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-tabs">
          <div className="terminal-tab active">TERMINAL</div>
          <div className="terminal-tab">OUTPUT</div>
          <div className="terminal-tab">DEBUG CONSOLE</div>
        </div>
        <div className="terminal-actions">
          <button className="terminal-btn" onClick={onClear} title="Clear Logs">
            <span className="icon">🧹</span>
          </button>
          <button className="terminal-btn" onClick={onClose} title="Close Panel">
            <span className="icon">✕</span>
          </button>
        </div>
      </div>
      <div className="terminal-body" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="terminal-empty">No logs to display</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`terminal-line ${log.type}`}>
              <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="log-source">[{log.source.toUpperCase()}]</span>
              <span className="log-content">{log.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
