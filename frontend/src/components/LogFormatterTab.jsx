import { useEffect, useState } from 'react';

const LogFormatterTab = () => {
  const [inputLog, setInputLog] = useState('');
  const [formattedLog, setFormattedLog] = useState('');
  const [error, setError] = useState(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    // Initialize Web Worker
    const newWorker = new Worker(new URL('../workers/logFormatter.worker.js', import.meta.url), { type: 'module' });

    newWorker.onmessage = (e) => {
      const { result, error: workerError } = e.data;
      if (workerError) {
        setError(workerError);
        setFormattedLog('');
      } else {
        setFormattedLog(result);
        setError(null);
        // Copy to clipboard not allowed in worker, do it here? 
        // Or maybe just let user copy manually since it's "huge text".
        // Actually, user might still expect auto-copy if it's small enough, but for huge text it might freeze UI again.
        // Let's try to copy if it's not insanely huge, or just skip auto-copy for huge logs.
        // For now, let's keep it safe and NOT auto-copy huge text to avoid main thread freeze on clipboard write.
        // But we can try.
        if (result.length < 100000) {
            navigator.clipboard.writeText(result).catch(() => {});
        }
      }
      setIsFormatting(false);
    };

    setWorker(newWorker);

    return () => {
      newWorker.terminate();
    };
  }, []);

  const handleFormat = () => {
    if (!inputLog.trim()) {
        setError("Please enter some log content to format.");
        setFormattedLog('');
        return;
    }

    setIsFormatting(true);
    setError(null);
    setFormattedLog(''); // Clear previous output while loading
    
    // Offload to worker
    if (worker) {
        worker.postMessage({ content: inputLog });
    } else {
        setError("Worker not initialized.");
        setIsFormatting(false);
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>

      
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Input Log Trace</label>
          <textarea
            style={{ 
              flex: 1, 
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '0.9rem',
              resize: 'none',
              border: error ? '2px solid #ef4444' : '1px solid var(--border-color)'
            }}
            value={inputLog}
            onChange={(e) => setInputLog(e.target.value)}
            placeholder="Paste your log trace here..."
            spellCheck="false"
          />
        </div>

        {/* Middle Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
          <button 
            onClick={handleFormat}
            disabled={isFormatting}
            style={{ 
              width: 'auto', 
              padding: '1rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              backgroundColor: isFormatting ? '#ccc' : undefined,
              cursor: isFormatting ? 'wait' : 'pointer'
            }}
            title="Format and Copy"
          >
            {isFormatting ? (
                <div style={{ width: '24px', height: '24px', border: '2px solid #333', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            )}
          </button>
           <style>
            {`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            `}
           </style>
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
              value={error || formattedLog}
              readOnly
              placeholder={isFormatting ? "Formatting..." : "Formatted log will appear here..."}
              spellCheck="false"
            />
            {formattedLog && !error && !isFormatting && (
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
                   {formattedLog.length < 100000 ? "Copied!" : "Ready"}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogFormatterTab;
