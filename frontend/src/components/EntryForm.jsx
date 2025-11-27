import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const EntryForm = ({ onEntrySaved, entryToEdit, onCancelEdit }) => {
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Autocomplete states
  const [allEntries, setAllEntries] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchEntries();
  }, [success]); // Re-fetch when a new entry is saved

  useEffect(() => {
    if (entryToEdit) {
      setProblem(entryToEdit.problem);
      setSolution(entryToEdit.solution);
      setSuccess('');
      setError('');
      setShowSuggestions(false);
    } else {
      setProblem('');
      setSolution('');
    }
  }, [entryToEdit]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

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
    
    if (value.trim().length > 0) {
      const filtered = allEntries.filter(entry => 
        entry.problem.toLowerCase().includes(value.toLowerCase()) &&
        entry.problem !== value // Don't suggest if it matches exactly
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setProblem(suggestion.problem);
    // Optional: Load the solution too if they pick an exact match, 
    // but for now just autocomplete the problem text as requested.
    // If we wanted to switch to edit mode, we'd need to notify the parent or handle internal ID state.
    // Let's just fill the text. The user can then see "Problem already exists" if they try to save,
    // or we could be smart and load the solution + ID if we had access to the setEntryToEdit from parent.
    // Since we don't have setEntryToEdit here, we'll just fill the text.
    setShowSuggestions(false);
  };

  const countWords = (str) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (countWords(problem) > 50) {
      setError('Problem must be 50 words or less.');
      return;
    }
    if (countWords(solution) > 200) {
      setError('Solution must be 200 words or less.');
      return;
    }

    try {
      if (entryToEdit) {
        await axios.put(`${config.API_URL}/api/entries/${entryToEdit.id}`, {
          problem,
          solution
        });
        setSuccess('Entry updated successfully!');
      } else {
        await axios.post(`${config.API_URL}/api/entries`, {
          problem,
          solution
        });
        setSuccess('Entry saved successfully!');
      }
      
      setProblem('');
      setSolution('');
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
      <h2>{entryToEdit ? 'Edit Issue' : 'Record Issue'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
          <label htmlFor="problem">Problem</label>
          <textarea
            id="problem"
            value={problem}
            onChange={handleProblemChange}
            onFocus={() => problem.trim().length > 0 && setShowSuggestions(true)}
            rows="3"
            placeholder="Describe the problem..."
            required
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.problem}
                </div>
              ))}
            </div>
          )}
          <div className="word-count" style={{ color: countWords(problem) > 50 ? '#ef4444' : 'inherit' }}>
            {countWords(problem)}/50 words
          </div>
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
          />
          <div className="word-count" style={{ color: countWords(solution) > 200 ? '#ef4444' : 'inherit' }}>
            {countWords(solution)}/200 words
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
      </form>
    </div>
  );
};

export default EntryForm;
