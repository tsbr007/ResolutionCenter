import axios from 'axios';
import { useState } from 'react';
import config from '../config';

const NotesTab = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    } catch (err) {
      console.error("Failed to save note", err);
      setError('Failed to save note.');
    }
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
    </div>
  );
};

export default NotesTab;
