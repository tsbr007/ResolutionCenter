import { useState } from 'react';

const JsonFormatterTab = () => {
  const [inputJson, setInputJson] = useState('');
  const [formattedJson, setFormattedJson] = useState('');
  const [error, setError] = useState(null);

  const handleFormat = () => {
    if (!inputJson.trim()) {
        setError("Please enter some JSON to format.");
        setFormattedJson('');
        return;
    }
    try {
      const parsed = JSON.parse(inputJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormattedJson(formatted);
      setError(null);
      navigator.clipboard.writeText(formatted);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      setFormattedJson('');
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>JSON Formatter</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Input</label>
          <textarea
            style={{ 
              flex: 1, 
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '0.9rem',
              resize: 'none',
              border: error ? '2px solid #ef4444' : '1px solid var(--border-color)'
            }}
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            placeholder="Paste your unformatted JSON here..."
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
          <label style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Output</label>
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
              value={error || formattedJson}
              readOnly
              placeholder="Formatted JSON will appear here..."
              spellCheck="false"
            />
            {formattedJson && !error && (
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

export default JsonFormatterTab;
