import { useState } from 'react';
import JsonFormatterTab from './JsonFormatterTab';
import SqlFormatterTab from './SqlFormatterTab';

const FormattersTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('json');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '1rem',
        gap: '1rem'
      }}>
        <button
          onClick={() => setActiveSubTab('json')}
          style={{
            width: 'auto',
            padding: '0.5rem 1.5rem',
            borderRadius: '9999px',
            backgroundColor: activeSubTab === 'json' ? 'var(--accent-color)' : 'transparent',
            color: activeSubTab === 'json' ? 'white' : 'var(--text-secondary)',
            border: activeSubTab === 'json' ? 'none' : '1px solid var(--border-color)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          JSON Formatter
        </button>
        <button
          onClick={() => setActiveSubTab('sql')}
          style={{
            width: 'auto',
            padding: '0.5rem 1.5rem',
            borderRadius: '9999px',
            backgroundColor: activeSubTab === 'sql' ? 'var(--accent-color)' : 'transparent',
            color: activeSubTab === 'sql' ? 'white' : 'var(--text-secondary)',
            border: activeSubTab === 'sql' ? 'none' : '1px solid var(--border-color)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          SQL Formatter
        </button>
      </div>

      <div style={{ flex: 1 }}>
        {activeSubTab === 'json' ? <JsonFormatterTab /> : <SqlFormatterTab />}
      </div>
    </div>
  );
};

export default FormattersTab;
