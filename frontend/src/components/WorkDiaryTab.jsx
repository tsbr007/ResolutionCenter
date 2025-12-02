import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const WorkDiaryTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  
  // Debounce save
  const timeoutRef = useRef(null);

  useEffect(() => {
    const fetchEntry = async (selectedDate) => {
      try {
        const response = await axios.get(`${config.API_URL}/api/diary/${selectedDate}`);
        setContent(response.data.content || '');
        setStatus('');
      } catch (error) {
        console.error('Error fetching diary entry:', error);
        setStatus('Error loading entry');
      }
    };

    fetchEntry(date);
  }, [date]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('Saving...');
    
    // Debounce save
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      saveEntry(date, newContent);
    }, 1000);
  };

  const saveEntry = async (selectedDate, entryContent) => {
    try {
      await axios.post(`${config.API_URL}/api/diary`, {
        date: selectedDate,
        content: entryContent
      });
      setStatus('Saved');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      console.error('Error saving diary entry:', error);
      setStatus('Error saving');
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Work Diary</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ 
            fontSize: '0.85rem', 
            color: status === 'Error saving' ? '#ef4444' : status === 'Saved' ? '#22c55e' : 'var(--text-secondary)',
            fontWeight: '500',
            opacity: status ? 1 : 0,
            transition: 'opacity 0.2s'
          }}>
            {status}
          </span>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-color)'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What happened today? Write your thoughts, achievements, and challenges..."
          style={{
            flex: 1,
            width: '100%',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            backgroundColor: '#f8fafc',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            lineHeight: '1.6',
            resize: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          className="diary-textarea"
          spellCheck="false"
        />
      </div>

      <style>{`
        .diary-textarea:focus {
          outline: none;
          border-color: var(--accent-color) !important;
          box-shadow: 0 0 0 4px rgba(215, 30, 40, 0.05);
          background-color: #ffffff !important;
        }
      `}</style>
    </div>
  );
};

export default WorkDiaryTab;
