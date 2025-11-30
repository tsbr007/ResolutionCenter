import { useEffect, useState } from 'react';

const WorldClockTab = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const clocks = [
    { label: 'India', zone: 'Asia/Kolkata', flag: '🇮🇳' },
    { label: 'Ireland', zone: 'Europe/Dublin', flag: '🇮🇪' },
    { label: 'Switzerland', zone: 'Europe/Zurich', flag: '🇨🇭' },
    { label: 'US Eastern', zone: 'America/New_York', flag: '🇺🇸' },
    { label: 'US Central', zone: 'America/Chicago', flag: '🇺🇸' },
    { label: 'US Pacific', zone: 'America/Los_Angeles', flag: '🇺🇸' },
  ];

  const formatTime = (date, timeZone) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
      timeZone: timeZone,
    }).format(date);
  };

  const formatDate = (date, timeZone) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timeZone,
    }).format(date);
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>World Clocks</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem',
        overflowY: 'auto',
        padding: '0.5rem'
      }}>
        {clocks.map((clock, index) => (
          <div 
            key={index}
            className="clock-card"
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>{clock.flag}</div>
            <h3 style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{clock.label}</h3>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatTime(time, clock.zone)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {formatDate(time, clock.zone)}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .clock-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default WorldClockTab;
