import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const EntryForm = ({ onEntrySaved, entryToEdit, onCancelEdit, viewMode, onEdit }) => {
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [appName, setAppName] = useState('default');
  const [user, setUser] = useState('admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Autocomplete states
  const [allEntries, setAllEntries] = useState([]);
  
  const [problemSuggestions, setProblemSuggestions] = useState([]);
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
  
  const [appSuggestions, setAppSuggestions] = useState([]);
  const [showAppSuggestions, setShowAppSuggestions] = useState(false);
  
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  const problemRef = useRef(null);
  const appRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    fetchEntries();
  }, [success]); // Re-fetch when a new entry is saved

  useEffect(() => {
    if (entryToEdit) {
      setProblem(entryToEdit.problem);
      setSolution(entryToEdit.solution);
      setAppName(entryToEdit.app_name || 'default');
      setUser(entryToEdit.last_updated_by || 'admin');
      setSuccess('');
      setError('');
      setShowProblemSuggestions(false);
      setShowAppSuggestions(false);
      setShowUserSuggestions(false);
    } else {
      setProblem('');
      setSolution('');
      setAppName('default');
      setUser('admin');
    }
  }, [entryToEdit]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (problemRef.current && !problemRef.current.contains(event.target)) {
        setShowProblemSuggestions(false);
      }
      if (appRef.current && !appRef.current.contains(event.target)) {
        setShowAppSuggestions(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/entries`);
      setAllEntries(response.data);
    } catch (err) {
      console.error('Failed to fetch entries for autocomplete', err);
    }
  };

  const handleProblemChange = (e) => {
    const value = e.target.value;
    setProblem(value);
    
    if (value.trim().length > 0 && !viewMode) {
      const filtered = allEntries.filter(entry => 
        entry.problem.toLowerCase().includes(value.toLowerCase()) &&
        entry.problem !== value
      );
      // Unique problems only
      const unique = [...new Map(filtered.map(item => [item.problem, item])).values()];
      setProblemSuggestions(unique);
      setShowProblemSuggestions(true);
    } else {
      setProblemSuggestions([]);
      setShowProblemSuggestions(false);
    }
  };

  const handleAppChange = (e) => {
    const value = e.target.value;
    setAppName(value);
    
    if (value.trim().length > 0 && !viewMode) {
      const filtered = allEntries.filter(entry => 
        (entry.app_name || '').toLowerCase().includes(value.toLowerCase()) &&
        entry.app_name !== value
      );
      // Unique app names
      const uniqueApps = [...new Set(filtered.map(item => item.app_name))];
      setAppSuggestions(uniqueApps);
      setShowAppSuggestions(true);
    } else {
      setAppSuggestions([]);
      setShowAppSuggestions(false);
    }
  };

  const handleUserChange = (e) => {
    const value = e.target.value;
    setUser(value);
    
    if (value.trim().length > 0 && !viewMode) {
      const filtered = allEntries.filter(entry => {
        const creator = entry.created_by || '';
        const updater = entry.last_updated_by || '';
        return (creator.toLowerCase().includes(value.toLowerCase()) && creator !== value) ||
               (updater.toLowerCase().includes(value.toLowerCase()) && updater !== value);
      });
      
      // Unique users
      const users = new Set();
      filtered.forEach(entry => {
        if (entry.created_by && entry.created_by.toLowerCase().includes(value.toLowerCase())) users.add(entry.created_by);
        if (entry.last_updated_by && entry.last_updated_by.toLowerCase().includes(value.toLowerCase())) users.add(entry.last_updated_by);
      });
      
      setUserSuggestions([...users]);
      setShowUserSuggestions(true);
    } else {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
    }
  };

  const countCharacters = (str) => {
    if (!str) return 0;
    return str.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return; // Should not happen as button is hidden, but safety check

    setError('');
    setSuccess('');

    if (countCharacters(problem) > 300) {
      setError('Problem must be 300 characters or less.');
      return;
    }
    if (countCharacters(solution) > 1200) {
      setError('Solution must be 1200 characters or less.');
      return;
    }

    try {
      if (entryToEdit) {
        await axios.put(`${config.API_URL}/api/entries/${entryToEdit.id}`, {
          problem,
          solution,
          app_name: appName,
          last_updated_by: user
        });
        setSuccess('Entry updated successfully!');
      } else {
        await axios.post(`${config.API_URL}/api/entries`, {
          problem,
          solution,
          app_name: appName,
          created_by: user,
          last_updated_by: user
        });
        setSuccess('Entry saved successfully!');
      }
      
      setProblem('');
      setSolution('');
      setAppName('default');
      // Keep user as is for convenience
      fetchEntries(); // Refresh autocomplete list
      if (onEntrySaved) onEntrySaved();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to save entry. Please try again.');
      }
      console.error(err);
    }
  };

  return (
    <div className="card">
      <h2>{viewMode ? 'View Issue' : (entryToEdit ? 'Edit Issue' : 'Record Issue')}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group" ref={problemRef} style={{ position: 'relative' }}>
          <label htmlFor="problem">Problem</label>
          <textarea
            id="problem"
            value={problem}
            onChange={handleProblemChange}
            onFocus={() => !viewMode && problem.trim().length > 0 && setShowProblemSuggestions(true)}
            rows="3"
            placeholder="Describe the problem..."
            required
            autoComplete="off"
            disabled={viewMode}
          />
          {showProblemSuggestions && problemSuggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {problemSuggestions.map((suggestion, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-item"
                  onClick={() => {
                    setProblem(suggestion.problem);
                    setShowProblemSuggestions(false);
                  }}
                >
                  {suggestion.problem}
                </div>
              ))}
            </div>
          )}
          {!viewMode && (
            <div className="word-count" style={{ color: countCharacters(problem) > 300 ? '#ef4444' : 'inherit' }}>
              {countCharacters(problem)}/300 characters
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="solution">Solution</label>
          <textarea
            id="solution"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows="6"
            placeholder="Describe the solution..."
            required
            disabled={viewMode}
          />
          {!viewMode && (
            <div className="word-count" style={{ color: countCharacters(solution) > 1200 ? '#ef4444' : 'inherit' }}>
              {countCharacters(solution)}/1200 characters
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" ref={appRef} style={{ position: 'relative' }}>
            <label htmlFor="appName">App Name</label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={handleAppChange}
              onFocus={() => !viewMode && appName.trim().length > 0 && setShowAppSuggestions(true)}
              placeholder="App Name"
              autoComplete="off"
              disabled={viewMode}
            />
            {showAppSuggestions && appSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {appSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="suggestion-item"
                    onClick={() => {
                      setAppName(suggestion);
                      setShowAppSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
            <label htmlFor="user">User</label>
            <input
              type="text"
              id="user"
              value={user}
              onChange={handleUserChange}
              onFocus={() => !viewMode && user.trim().length > 0 && setShowUserSuggestions(true)}
              placeholder="User"
              autoComplete="off"
              disabled={viewMode}
            />
            {showUserSuggestions && userSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {userSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="suggestion-item"
                    onClick={() => {
                      setUser(suggestion);
                      setShowUserSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {!viewMode ? (
            <>
              <button type="submit">{entryToEdit ? 'Update Entry' : 'Save Entry'}</button>
              {entryToEdit && (
                <button 
                  type="button" 
                  onClick={onCancelEdit}
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Edit
              </button>
              <button 
                type="button" 
                onClick={onCancelEdit}
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </>
          )}
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
      </form>
    </div>
  );
};

export default EntryForm;
