import React, { useState } from 'react';
import { SearchAPI } from '../services/api';

export default function SearchPanel({ project, onFileSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim() || !project) return;

    setSearching(true);
    try {
      const { data } = await SearchAPI.get('/', {
        params: { q: query, projectId: project.project_id }
      });
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="sidebar" style={{ borderRight: '1px solid var(--border)' }}>
      <div className="sidebar-header">
        <span>SEARCH</span>
      </div>

      <div style={{ padding: '12px' }}>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="form-input"
            placeholder="Search in files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontSize: '12px', height: '30px' }}
          />
        </form>
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        {searching && <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>Searching...</div>}
        
        {!searching && results.length === 0 && query && (
          <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>No results found</div>
        )}

        {results.map((res, i) => (
          <div 
            key={i} 
            className="file-item" 
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '10px 12px' }}
            onClick={() => onFileSelect({ file_id: res.file_id, file_name: res.file_name })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>📄</span>
              <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)' }}>{res.file_name}</span>
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)', 
              background: 'var(--bg-darkest)', 
              padding: '4px 6px', 
              borderRadius: '4px',
              width: '100%',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border)'
            }}>
              {res.snippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
