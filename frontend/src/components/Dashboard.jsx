import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

const Dashboard = ({ refreshTrigger, onEdit, onRowClick }) => {
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
      (entry.solution && entry.solution.toLowerCase().includes(lowerTerm)) ||
      (entry.app_name && entry.app_name.toLowerCase().includes(lowerTerm)) ||
      (entry.created_by && entry.created_by.toLowerCase().includes(lowerTerm))
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="card">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search problems, solutions, apps, or users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Problem</th>
              <th style={{ width: '40%' }}>Solution</th>
              <th style={{ width: '10%' }}>App</th>
              <th style={{ width: '10%' }}>Created</th>
              <th style={{ width: '10%' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {entries.length === 0 ? 'No entries yet.' : 'No matches found.'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => (
                <tr key={index} onClick={() => onRowClick(entry)}>
                  <td className="entry-problem" style={{ fontSize: '1rem' }} title={entry.problem}>{entry.problem}</td>
                  <td className="entry-solution" style={{ fontSize: '0.9rem' }} title={entry.solution}>{entry.solution}</td>
                  <td title={entry.app_name}>{entry.app_name || 'default'}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{entry.created_by || 'admin'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(entry.creation_date)}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{entry.last_updated_by || 'admin'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(entry.last_update_date)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
