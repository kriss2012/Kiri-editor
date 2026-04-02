import React from 'react';

function getFileIcon(fileName) {
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return '🟨';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '🔷';
  if (fileName.endsWith('.py')) return '🐍';
  if (fileName.endsWith('.md')) return '📄';
  if (fileName.endsWith('.json')) return '🔧';
  if (fileName.endsWith('.css')) return '🎨';
  if (fileName.endsWith('.html')) return '🌐';
  if (fileName.endsWith('.sql')) return '🗄️';
  if (fileName.endsWith('.txt')) return '📝';
  return '📄';
}

export default function FileExplorer({
  project, files, activeFileId,
  onFileSelect, onNewFile, onDeleteFile, onNewProject, onOpenProjects
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>Explorer</span>
        <div className="sidebar-actions">
          <button id="btn-new-file" className="icon-btn" title="New File" onClick={onNewFile}>+</button>
          <button id="btn-open-projects" className="icon-btn" title="Open Projects" onClick={onOpenProjects}>⊞</button>
        </div>
      </div>

      <div className="sidebar-section">
        {project ? (
          <>
            <div className="project-label">
              <span>📁</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.project_name}
              </span>
            </div>
            {files.map(file => (
              <div
                key={file.file_id}
                id={`file-${file.file_id}`}
                className={`file-item ${file.file_id === activeFileId ? 'active' : ''}`}
                onClick={() => onFileSelect(file)}
              >
                <span className="file-icon">{getFileIcon(file.file_name)}</span>
                <span className="file-name">{file.file_name}</span>
                <div className="file-item-actions">
                  <button
                    className="icon-btn"
                    title="Delete file"
                    onClick={e => { e.stopPropagation(); onDeleteFile(file.file_id); }}
                    style={{ width: 18, height: 18, fontSize: 11 }}
                  >✕</button>
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div style={{ padding: '12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                No files yet
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '16px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            No project open
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button id="btn-new-file-footer" className="new-file-btn" onClick={onNewFile} disabled={!project}>
          <span>+</span> New File
        </button>
        <button id="btn-new-project" className="new-project-btn" onClick={onNewProject}>
          <span>⊕</span> New Project
        </button>
      </div>
    </div>
  );
}
