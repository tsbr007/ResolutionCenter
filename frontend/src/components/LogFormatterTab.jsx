import { useEffect, useRef, useState } from 'react';
import config from '../config';

const LogFormatterTab = () => {
  const [inputLog, setInputLog] = useState('');
  const [formattedLog, setFormattedLog] = useState('');
  const [error, setError] = useState(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [worker, setWorker] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // { explanation, solution, elapsedSeconds, fromCache }
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  const CACHE_PREFIX = 'log_analysis_';

  const formatDuration = (secs) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  };

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

  const handleAnalyze = async () => {
    if (!formattedLog && !inputLog) {
        setError('Please format a log or enter log content first.');
        return;
    }

    const logContent = formattedLog || inputLog;

    // Cache key = first non-empty line of the log (trimmed)
    const cacheKey = CACHE_PREFIX + (logContent.split('\n').find(l => l.trim()) || logContent).trim();

    // --- Check localStorage cache first ---
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            setAnalysisResult({ ...parsed, fromCache: true });
            setElapsedSeconds(parsed.elapsedSeconds || 0);
            return; // Served from cache — no API call needed
        }
    } catch (_) { /* ignore corrupt cache */ }

    // --- Cache miss: call backend ---
    setIsAnalyzing(true);
    setElapsedSeconds(0);
    setError(null);
    setAnalysisResult(null);

    timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
    }, 1000);

    try {
        const response = await fetch(`${config.API_URL}/api/analyze-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log_content: logContent }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Analysis failed');
        }

        const data = await response.json();

        // Capture the elapsed time at the moment we got the response
        clearInterval(timerRef.current);
        timerRef.current = null;
        const finalElapsed = elapsedSeconds; // snapshot before reset

        const resultToStore = {
            explanation: data.explanation,
            solution: data.solution,
            elapsedSeconds: finalElapsed,
            fromCache: false,
        };

        // Persist to localStorage
        try { localStorage.setItem(cacheKey, JSON.stringify(resultToStore)); } catch (_) {}

        setAnalysisResult(resultToStore);
    } catch (err) {
        setError(`Analysis failed: ${err.message}`);
    } finally {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsAnalyzing(false);
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

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!inputLog && !formattedLog)}
            style={{ 
              width: 'auto', 
              padding: '1rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              backgroundColor: isAnalyzing ? '#ccc' : '#3b82f6',
              color: 'white',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              marginTop: '1rem'
            }}
            title="Analyze with AI"
          >
            {isAnalyzing ? (
                <div style={{ width: '24px', height: '24px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
            )}
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

      {/* AI Analysis Loading State */}
      {isAnalyzing && (
        <div style={{
          marginTop: '1rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: '#3b82f6',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <span style={{ fontWeight: '600', color: '#1d4ed8', fontSize: '0.9rem' }}>
                🤖 AI is analyzing your logs...
              </span>
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#64748b',
              background: '#e2e8f0',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontWeight: '600'
            }}>
              {formatDuration(elapsedSeconds)} elapsed
            </span>
          </div>

          {/* Shimmer progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '9999px',
            background: '#dbeafe',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0,
              height: '100%',
              width: '40%',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              animation: 'shimmerBar 1.8s ease-in-out infinite'
            }} />
          </div>

          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
            Local AI models may take 15–60 seconds depending on your hardware. Please wait…
          </p>

          <style>{`
            @keyframes shimmerBar {
              0%   { left: -40%; }
              100% { left: 100%; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.5; transform: scale(1.4); }
            }
          `}</style>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div style={{
            marginTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
        }}>
            {/* Result header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    🤖 AI Analysis
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Elapsed time badge — always shown */}
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontWeight: '600'
                    }}>
                        ⏱ {analysisResult.fromCache ? 'Cached · Generated in' : 'Generated in'} {formatDuration(analysisResult.elapsedSeconds)}
                    </span>
                    {/* Cache hit badge */}
                    {analysisResult.fromCache && (
                        <span style={{
                            fontSize: '0.75rem',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            color: '#15803d',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontWeight: '700'
                        }}>
                            ⚡ From Cache
                        </span>
                    )}
                    {/* Clear cache icon button */}
                    <button
                        onClick={() => {
                            const logContent = formattedLog || inputLog;
                            const cacheKey = CACHE_PREFIX + (logContent.split('\n').find(l => l.trim()) || logContent).trim();
                            localStorage.removeItem(cacheKey);
                            setAnalysisResult(null);
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'color 0.15s'
                        }}
                        title="Clear cached result and re-analyze"
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Explanation + Solution side by side */}
            <div style={{ display: 'flex', gap: '1.5rem', overflowY: 'auto', maxHeight: '300px' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#3b82f6' }}>Explanation</h3>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        lineHeight: '1.5',
                        color: '#1e3a8a'
                    }}>
                        {analysisResult.explanation}
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#10b981' }}>Solution</h3>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fff',
                        border: '1px solid #a7f3d0',
                        borderRadius: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        lineHeight: '1.5',
                        color: '#064e3b'
                    }}>
                        {analysisResult.solution}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LogFormatterTab;
