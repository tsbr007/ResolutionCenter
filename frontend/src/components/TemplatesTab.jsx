import axios from 'axios';
import { marked } from 'marked';
import { useEffect, useState } from 'react';
import config from '../config';

const TemplatesTab = () => {
  const [templates, setTemplates] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get(`${config.API_URL}/api/templates`);
        setTemplates(response.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, []);

  const handleCopy = async (content, name) => {
    try {
      const html = await marked.parse(content);
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([content], { type: "text/plain" });
      const data = [new ClipboardItem({ 
        "text/html": htmlBlob,
        "text/plain": textBlob 
      })];
      
      await navigator.clipboard.write(data);
      setCopyFeedback(`Copied "${name}" as Rich Text!`);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error("Rich copy failed:", err);
      navigator.clipboard.writeText(content).then(() => {
        setCopyFeedback(`Copied "${name}" (Markdown only)`);
        setTimeout(() => setCopyFeedback(null), 3000);
      });
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Templates</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '1.5rem',
        overflowY: 'auto',
        padding: '0.5rem'
      }}>
        {templates.map((template, index) => (
          <div 
            key={index}
            onClick={() => handleCopy(template.content, template.name)}
            className="template-card"
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>{template.name}</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {template.content}
            </p>
            <div style={{ 
              marginTop: 'auto', 
              paddingTop: '1rem', 
              fontSize: '0.8rem', 
              color: 'var(--accent-color)', 
              fontWeight: '600' 
            }}>
              Click to Copy
            </div>
          </div>
        ))}
      </div>

      {copyFeedback && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#22c55e',
          color: 'white',
          borderRadius: '9999px',
          fontWeight: '600',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          animation: 'fadeIn 0.3s ease-out',
          zIndex: 100
        }}>
          {copyFeedback}
        </div>
      )}

      <style>{`
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border-color: var(--accent-color);
        }
        .template-card:active {
          transform: scale(0.98);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default TemplatesTab;
