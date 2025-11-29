import axios from 'axios';
import { useState } from 'react';
import config from '../config';

const SearchTab = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${config.API_URL}/api/search`, {
        params: { q: query }
      });
      setResults(response.data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-tab">
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Search Files</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
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
        </form>
      </div>

      {searched && (
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
    </div>
  );
};

export default SearchTab;
