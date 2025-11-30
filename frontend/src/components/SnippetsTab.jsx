import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const SnippetsTab = () => {
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get(`${config.API_URL}/api/frequent`);
        setItems(response.data);
      } catch (error) {
        console.error('Error fetching snippets:', error);
      }
    };

    fetchItems();
    
    // Click outside handler
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim()) {
      const filtered = items.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (item) => {
    setInputValue(item);
    setShowSuggestions(false);
    copyToClipboard(item);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(`Copied: "${text}"`);
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Snippets</h2>
      
      <div style={{ width: '100%', maxWidth: '600px', position: 'relative' }} ref={wrapperRef}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.trim() && setShowSuggestions(true)}
            placeholder="Type to search snippets..."
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              fontSize: '1.1rem',
              borderRadius: '9999px',
              border: '2px solid var(--border-color)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }}
            className="frequent-input"
          />
          <div style={{
            position: 'absolute',
            right: '1.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            pointerEvents: 'none'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '120%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--card-bg)',
            borderRadius: '1rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-color)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 50
          }}>
            {suggestions.map((item, index) => (
              <div
                key={index}
                onClick={() => handleSelect(item)}
                style={{
                  padding: '1rem 1.5rem',
                  cursor: 'pointer',
                  borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid var(--border-color)',
                  transition: 'background-color 0.2s',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      {copyFeedback && (
        <div style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#22c55e',
          color: 'white',
          borderRadius: '9999px',
          fontWeight: '600',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {copyFeedback}
        </div>
      )}
      
      <style>{`
        .frequent-input:focus {
          outline: none;
          border-color: var(--accent-color) !important;
          box-shadow: 0 0 0 4px rgba(215, 30, 40, 0.1) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SnippetsTab;
