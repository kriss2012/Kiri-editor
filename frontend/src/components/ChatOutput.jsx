import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AGENT_META = {
  documentation: { icon: '📝', name: 'Documentation Agent', color: 'var(--agent-doc)' },
  code:          { icon: '⚡', name: 'Code Agent',           color: 'var(--agent-code)' },
  explanation:   { icon: '💡', name: 'Explanation Agent',   color: 'var(--agent-explain)' },
  search:        { icon: '🔍', name: 'Search Agent',         color: 'var(--agent-search)' },
  debug:         { icon: '🐛', name: 'Debug Agent',          color: 'var(--agent-debug)' },
  test:          { icon: '🧪', name: 'Test Agent',           color: 'var(--agent-test)' },
};

function MessageBlock({ msg }) {
  const meta = AGENT_META[msg.agentType] || { icon: '🤖', name: msg.agentType, color: 'var(--accent)' };
  const isStreaming = msg.streaming;

  return (
    <div className="message-block">
      <div className="message-header">
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <span className="message-agent-name" style={{ color: meta.color }}>{meta.name}</span>
        {isStreaming && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>● streaming</span>}
        <span className="message-time">{msg.time}</span>
      </div>
      <div className="message-content">
        <div className={`md-output ${isStreaming ? 'typing-cursor' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default function ChatOutput({ messages, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="output-panel">
      <div className="output-header">
        <span>Agent Output</span>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={onClear}>Clear</button>
        )}
      </div>
      <div className="output-messages">
        {messages.length === 0 ? (
          <div className="output-empty">
            <div style={{ fontSize: 32 }}>🤖</div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No output yet</div>
            <div>Select an agent and click Run</div>
          </div>
        ) : (
          messages.map(msg => <MessageBlock key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
