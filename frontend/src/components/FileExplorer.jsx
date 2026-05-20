import React from 'react';

function getFileTag(fileName) {
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return '[JS]';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '[TS]';
  if (fileName.endsWith('.py')) return '[PY]';
  if (fileName.endsWith('.md')) return '[MD]';
  if (fileName.endsWith('.json')) return '[CFG]';
  if (fileName.endsWith('.css')) return '[CSS]';
  if (fileName.endsWith('.html')) return '[HTML]';
  if (fileName.endsWith('.sql')) return '[SQL]';
  if (fileName.endsWith('.txt')) return '[TXT]';
  return '[FILE]';
}

export default function FileExplorer({
  project, files, activeFileId,
  onFileSelect, onNewFile, onDeleteFile, onNewProject, onOpenProjects, onPreviewProject
}) {
  return (
    <div className="sidebar" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="sidebar-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-darkest)' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}># TREE_EXPLORER</span>
        <div className="sidebar-actions">
          <button id="btn-new-file" className="icon-btn" title="New File" onClick={onNewFile} style={{ color: 'var(--accent)' }}>[+]</button>
          <button id="btn-open-projects" className="icon-btn" title="Open Projects" onClick={onOpenProjects} style={{ color: 'var(--text-secondary)' }}>[⊞]</button>
        </div>
      </div>

      <div className="sidebar-section">
        {project ? (
          <>
            <div className="project-label" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: 'rgba(57, 255, 20, 0.02)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--accent)', marginRight: 6 }}>[DIR]</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>
                    {project.project_name.toUpperCase()}
                  </span>
                </div>
                <button 
                  className="cyber-btn" 
                  title="Live Preview Server" 
                  onClick={onPreviewProject}
                  style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px', border: '1px solid var(--accent)' }}
                >
                  RUN_SVC
                </button>
              </div>
              {project.custom_path && (
                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                  └─ {project.custom_path}
                </div>
              )}
            </div>
            
            <div style={{ padding: '6px 0' }}>
              {files.map(file => (
                <div
                  key={file.file_id}
                  id={`file-${file.file_id}`}
                  className={`file-item ${file.file_id === activeFileId ? 'active' : ''}`}
                  onClick={() => onFileSelect(file)}
                  style={{ paddingLeft: 16 }}
                >
                  <span className="file-icon" style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold', marginRight: 4 }}>
                    {getFileTag(file.file_name)}
                  </span>
                  <span className="file-name" style={{ fontSize: '12px' }}>{file.file_name}</span>
                  <div className="file-item-actions">
                    <button
                      className="icon-btn"
                      title="Delete file"
                      onClick={e => { e.stopPropagation(); onDeleteFile(file.file_id); }}
                      style={{ width: 18, height: 18, fontSize: 9, color: 'var(--error)' }}
                    >[X]</button>
                  </div>
                </div>
              ))}
            </div>
            
            {files.length === 0 && (
              <div style={{ padding: '12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                -- empty directory --
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '16px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            [!] NO TARGET MOUNTED
          </div>
        )}
      </div>

      <div className="sidebar-footer" style={{ background: 'var(--bg-darkest)', borderTop: '1px solid var(--border)' }}>
        <button id="btn-new-file-footer" className="new-file-btn cyber-btn" onClick={onNewFile} disabled={!project}>
          [+] NEW_FILE
        </button>
        <button id="btn-new-project" className="new-project-btn cyber-btn green" onClick={onNewProject}>
          [⊞] WORKSPACES
        </button>
      </div>
    </div>
  );
}
