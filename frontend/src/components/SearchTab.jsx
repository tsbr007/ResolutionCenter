import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

const SearchTab = () => {
  const [query, setQuery] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recursive, setRecursive] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerData, setPickerData] = useState({ current_path: '', folders: [] });

  useEffect(() => {
    // Fetch default path on mount
    const fetchDefaultPath = async () => {
      try {
        const response = await axios.get(`${config.API_URL}/api/browse`);
        if (response.data && response.data.current_path) {
          setFolderPath(response.data.current_path);
        }
      } catch (err) {
        console.error("Failed to fetch default path", err);
      }
    };
    fetchDefaultPath();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${config.API_URL}/api/search`, {
        params: { q: query, folder_path: folderPath, recursive: recursive }
      });
      setResults(response.data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async (path) => {
    setLoading(true);
    try {
      const response = await axios.get(`${config.API_URL}/api/browse`, {
        params: { path }
      });
      setPickerData(response.data);
    } catch (err) {
      console.error("Failed to browse folders", err);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    setShowPicker(true);
    fetchFolders(folderPath);
  };

  const handleFolderClick = (folderName) => {
    // Construct new path. Handle Windows backslashes if present in current_path
    const current = pickerData.current_path;
    const separator = current.includes('\\') ? '\\' : '/';
    const newPath = current.endsWith(separator) ? `${current}${folderName}` : `${current}${separator}${folderName}`;
    fetchFolders(newPath);
  };

  return (
    <div className="search-tab">
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Search Files</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Folder path"
              style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', flex: 1 }}
            />
            <button type="button" onClick={openPicker} style={{ width: 'auto', background: 'var(--text-secondary)' }}>
              Browse
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by filename or content..."
                style={{ flex: 1 }}
              />
              <button type="submit" style={{ width: 'auto' }} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          <label className="checkbox-wrapper">
            <input 
              type="checkbox" 
              checked={recursive} 
              onChange={(e) => setRecursive(e.target.checked)} 
            />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Search sub-folders recursively</span>
          </label>
        </form>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <div className="loading-text">Searching files...</div>
        </div>
      )}

      {!loading && searched && (
        <div className="search-results">
          <h3>Results ({results.length})</h3>
          {results.length === 0 ? (
            <p>No results found.</p>
          ) : (
            <div className="results-list">
              {results.map((result, idx) => (
                <div key={idx} className="card result-card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{result.file}</span>
                    <span className="badge" style={{ 
                      backgroundColor: result.match_type === 'filename' ? '#e0f2fe' : '#fef3c7',
                      color: result.match_type === 'filename' ? '#0369a1' : '#b45309',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      {result.match_type === 'filename' ? 'Filename Match' : 'Content Match'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {result.path}
                  </div>
                  {result.snippet && (
                    <div style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace'
                    }}>
                      {result.snippet}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Select Folder</h3>
              <button onClick={() => setShowPicker(false)} className="modal-close">&times;</button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--input-bg)', borderRadius: '4px', wordBreak: 'break-all' }}>
              <strong>Current:</strong> {pickerData.current_path || (loading ? 'Loading...' : 'Not connected')}
            </div>

            <div className="folder-list" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              {loading && <div style={{ padding: '1rem', textAlign: 'center' }}>Loading folders...</div>}
              
              {!loading && pickerData.current_path && (
                <>
                  {pickerData.parent_path && (
                    <div 
                      onClick={() => fetchFolders(pickerData.parent_path)} 
                      className="suggestion-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📁</span> .. (Up)
                    </div>
                  )}
                  {pickerData.folders.map((folder, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleFolderClick(folder)} 
                      className="suggestion-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📁</span> {folder}
                    </div>
                  ))}
                  {pickerData.folders.length === 0 && !pickerData.parent_path && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No subfolders found
                    </div>
                  )}
                </>
              )}
              
              {!loading && !pickerData.current_path && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--accent-color)' }}>
                  Error: Could not fetch folders. Please ensure backend is running.
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setShowPicker(false)} 
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => { setFolderPath(pickerData.current_path); setShowPicker(false); }}
              >
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchTab;
