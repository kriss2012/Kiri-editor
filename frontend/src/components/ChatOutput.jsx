import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div 
      className="message-block"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="message-header">
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <span className="message-agent-name" style={{ color: meta.color }}>{meta.name}</span>
        {isStreaming && (
          <motion.span 
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1, 0.95] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 8, fontWeight: 700 }}
          >● STREAMING</motion.span>
        )}
        <span className="message-time">{msg.time}</span>
      </div>
      <div className="message-content">
        <div className={`md-output ${isStreaming ? 'typing-cursor' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
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
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.button 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="clear-btn" 
              onClick={onClear}
            >Clear</motion.button>
          )}
        </AnimatePresence>
      </div>
      <div className="output-messages">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="output-empty"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                style={{ fontSize: 32 }}
              >🤖</motion.div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No output yet</div>
              <div style={{ fontSize: 11 }}>Select an agent and click Run</div>
            </motion.div>
          ) : (
            messages.map(msg => <MessageBlock key={msg.id} msg={msg} />)
          )}
        </AnimatePresence>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}
