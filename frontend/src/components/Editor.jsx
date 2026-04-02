import React, { useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';

function getLanguage(fileName) {
  if (!fileName) return 'javascript';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
  if (fileName.endsWith('.py')) return 'python';
  if (fileName.endsWith('.md')) return 'markdown';
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.html')) return 'html';
  if (fileName.endsWith('.sql')) return 'sql';
  if (fileName.endsWith('.txt')) return 'plaintext';
  return 'javascript';
}

function getFileIcon(fileName) {
  if (!fileName) return '📄';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return '🟨';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '🔷';
  if (fileName.endsWith('.py')) return '🐍';
  if (fileName.endsWith('.md')) return '📄';
  if (fileName.endsWith('.json')) return '🔧';
  if (fileName.endsWith('.css')) return '🎨';
  if (fileName.endsWith('.html')) return '🌐';
  if (fileName.endsWith('.sql')) return '🗄️';
  return '📄';
}

export default function Editor({ openTabs, activeFileId, onTabSelect, onTabClose, onContentChange, files }) {
  const editorRef = useRef(null);

  const activeFile = files.find(f => f.file_id === activeFileId);
  const openTabFiles = openTabs.map(id => files.find(f => f.file_id === id)).filter(Boolean);

  function handleEditorMount(editor) {
    editorRef.current = editor;
    // Add keyboard shortcut: Ctrl+S to save
    editor.addCommand(
      // monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
      2097 | 49,
      () => { /* save is handled via onChange */ }
    );
  }

  return (
    <div className="editor-area">
      {/* Tab bar */}
      <div className="editor-tabs">
        {openTabFiles.map(file => (
          <div
            key={file.file_id}
            id={`tab-${file.file_id}`}
            className={`editor-tab ${file.file_id === activeFileId ? 'active' : ''}`}
            onClick={() => onTabSelect(file.file_id)}
          >
            <span>{getFileIcon(file.file_name)}</span>
            <span>{file.file_name}</span>
            <div
              className="tab-close"
              onClick={e => { e.stopPropagation(); onTabClose(file.file_id); }}
            >✕</div>
          </div>
        ))}
      </div>

      {/* Monaco Editor */}
      <div className="editor-container">
        {activeFile ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(activeFile.file_name)}
            value={activeFile.file_content || ''}
            theme="vs-dark"
            onChange={(value) => onContentChange(activeFile.file_id, value || '')}
            onMount={handleEditorMount}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 22,
              minimap: { enabled: true, scale: 0.8 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
              automaticLayout: true,
              suggest: { preview: true },
              stickyScroll: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        ) : (
          <div className="editor-empty-state">
            <div className="empty-logo">⚡</div>
            <h3>Kiri Editor</h3>
            <p>Open a file from the explorer to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
