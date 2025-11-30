import { useState } from 'react';
import { format } from 'sql-formatter';

const SqlFormatterTab = () => {
  const [inputSql, setInputSql] = useState('');
  const [formattedSql, setFormattedSql] = useState('');
  const [error, setError] = useState(null);

  const handleFormat = () => {
    if (!inputSql.trim()) {
        setError("Please enter some SQL to format.");
        setFormattedSql('');
        return;
    }
    try {
      // 1. Format the SQL with indentation
      let formatted = format(inputSql, {
        language: 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2,
      });

      // 2. Custom Upper Case Logic (preserving quotes)
      // The sql-formatter handles keywords, but user asked for "all characters" to be upper case
      // EXCEPT text in quotes.
      // We need to be careful here. Usually, only keywords and identifiers are uppercased in SQL.
      // If the user literally means EVERYTHING outside quotes (including table names, column names),
      // we can try a regex approach on the formatted string.
      
      // Regex to find strings in single or double quotes
      const quoteRegex = /('[^']*')|("[^"]*")/g;
      const placeholders = [];
      
      // Replace quoted strings with placeholders
      let tempSql = formatted.replace(quoteRegex, (match) => {
        placeholders.push(match);
        return `__SQL_PLACEHOLDER_${placeholders.length - 1}__`;
      });

      // Upper case everything else
      tempSql = tempSql.toUpperCase();

      // Restore quoted strings
      formatted = tempSql.replace(/__SQL_PLACEHOLDER_(\d+)__/g, (match, index) => {
        return placeholders[parseInt(index)];
      });

      setFormattedSql(formatted);
      setError(null);
      navigator.clipboard.writeText(formatted);
    } catch (err) {
      setError(`Formatting Failed: ${err.message}`);
      setFormattedSql('');
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>SQL Formatter</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Input SQL</label>
          <textarea
            style={{ 
              flex: 1, 
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '0.9rem',
              resize: 'none',
              border: error ? '2px solid #ef4444' : '1px solid var(--border-color)'
            }}
            value={inputSql}
            onChange={(e) => setInputSql(e.target.value)}
            placeholder="SELECT * FROM table WHERE id = 1..."
            spellCheck="false"
          />
        </div>

        {/* Middle Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
          <button 
            onClick={handleFormat}
            style={{ 
              width: 'auto', 
              padding: '1rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            title="Format and Copy"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Right Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Formatted Output</label>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <textarea
              style={{ 
                flex: 1, 
                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                fontSize: '0.9rem',
                resize: 'none',
                backgroundColor: error ? '#fef2f2' : '#f8fafc',
                color: error ? '#ef4444' : 'var(--text-primary)',
                borderColor: error ? '#ef4444' : 'var(--border-color)'
              }}
              value={error || formattedSql}
              readOnly
              placeholder="Formatted SQL will appear here..."
              spellCheck="false"
            />
            {formattedSql && !error && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    pointerEvents: 'none'
                }}>
                    Copied!
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SqlFormatterTab;
