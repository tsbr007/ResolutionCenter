import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

const NotesTab = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recentNotes, setRecentNotes] = useState([]);

  useEffect(() => {
    fetchRecentNotes();
  }, []);

  const fetchRecentNotes = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/notes/recent`);
      setRecentNotes(response.data);
    } catch (err) {
      console.error("Failed to fetch recent notes", err);
    }
  };

  const countWords = (str) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (countWords(content) > 5000) {
      setError('Notes must be 5000 words or less.');
      return;
    }

    try {
      await axios.post(`${config.API_URL}/api/notes`, {
        title,
        content
      });
      setMessage('Note saved successfully!');
      setTitle('');
      setContent('');
      fetchRecentNotes();
    } catch (err) {
      console.error("Failed to save note", err);
      setError('Failed to save note.');
    }
  };

  const handlePaste = (e, setFunction, currentValue) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Replace ; " and -> (arrow) with -
    // Also handling standard arrow symbols if they appear
    const sanitizedText = pastedText
      .replace(/[;"\u2190\u2191\u2192\u2193]/g, '-') // Replace semi-colon, double-quote, and arrow symbols
      .replace(/->/g, '-'); // Replace text arrow "->"

    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    const newValue = currentValue.substring(0, start) + sanitizedText + currentValue.substring(end);
    setFunction(newValue);
    
    // We need to manually update the cursor position after the state update renders
    // Since React state updates are async, we use setTimeout to run this after render
    setTimeout(() => {
        if (target) {
            target.selectionStart = target.selectionEnd = start + sanitizedText.length;
        }
    }, 0);
  };

  const loadNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="card">
      <h2>Create Note</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="noteTitle">Title</label>
          <input
            id="noteTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPaste={(e) => handlePaste(e, setTitle, title)}
            placeholder="Short text title..."
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="noteContent">Notes</label>
          <textarea
            id="noteContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={(e) => handlePaste(e, setContent, content)}
            rows="15"
            placeholder="Enter your notes here..."
            required
          />
          <div className="word-count" style={{ color: countWords(content) > 5000 ? '#ef4444' : 'inherit' }}>
            {countWords(content)}/5000 words
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" style={{ width: 'auto', minWidth: '120px' }}>Save Note</button>
        </div>
        
        {message && <div className="success-msg">{message}</div>}
        {error && <div className="error-msg">{error}</div>}
      </form>

      <div style={{ marginTop: '2rem' }}>
        <h3>Recent Notes (Last 30 Days)</h3>
        {recentNotes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No recent notes found.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Preview</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentNotes.map((note, index) => (
                  <tr key={index} onClick={() => loadNote(note)} style={{ cursor: 'pointer' }}>
                    <td>{note.title}</td>
                    <td title={note.content}>
                      {note.content.length > 50 
                        ? note.content.substring(0, 50) + '...' 
                        : note.content}
                    </td>
                    <td>{new Date(note.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .table-container {
          overflow-x: auto;
          margin-top: 1rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .data-table th, .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .data-table th {
          background-color: var(--bg-secondary);
          font-weight: 600;
          color: var(--text-primary);
        }
        .data-table tr:last-child td {
          border-bottom: none;
        }
        .data-table tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
      `}</style>
    </div>
  );
};

export default NotesTab;
