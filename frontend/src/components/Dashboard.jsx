import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

const Dashboard = ({ refreshTrigger, onEdit }) => {
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEntries, setFilteredEntries] = useState([]);

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = entries.filter(entry => 
      (entry.problem && entry.problem.toLowerCase().includes(lowerTerm)) || 
      (entry.solution && entry.solution.toLowerCase().includes(lowerTerm))
    );
    setFilteredEntries(filtered);
  }, [searchTerm, entries]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/entries`);
      setEntries(response.data);
    } catch (err) {
      console.error('Failed to fetch entries', err);
    }
  };

  return (
    <div className="card">
      <h2>Knowledge Hub</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search problems or solutions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="entry-list">
        {filteredEntries.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            {entries.length === 0 ? 'No entries yet.' : 'No matches found.'}
          </p>
        ) : (
          filteredEntries.map((entry, index) => (
            <div key={index} className="entry-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="entry-problem">{entry.problem}</div>
                <button 
                  onClick={() => onEdit(entry)}
                  style={{ 
                    width: 'auto', 
                    padding: '0.25rem 0.75rem', 
                    fontSize: '0.8rem',
                    marginLeft: '1rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)'
                  }}
                >
                  Edit
                </button>
              </div>
              <div className="entry-solution">{entry.solution}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
