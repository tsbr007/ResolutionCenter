import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const WorkDiaryTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [entriesWithData, setEntriesWithData] = useState(new Set());
  
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
    // Sync viewDate when date changes manually (e.g. via date picker)
    setViewDate(date);
  }, [date]);

  // Fetch entries for the view month to show dots
  useEffect(() => {
    const fetchMonthEntries = async () => {
      try {
        const yearMonth = viewDate.substring(0, 7); // YYYY-MM
        const response = await axios.get(`${config.API_URL}/api/diary/month/${yearMonth}`);
        setEntriesWithData(new Set(response.data));
      } catch (error) {
        console.error('Error fetching month entries:', error);
      }
    };
    fetchMonthEntries();
  }, [viewDate]);

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
      
      // Update entriesWithData if new content is not empty
      if (entryContent.trim()) {
          setEntriesWithData(prev => new Set(prev).add(selectedDate));
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
      setStatus('Error saving');
    }
  };

  // Day selector logic
  const getDaysInMonth = (dateString) => {
    const [year, month] = dateString.split('-').map(Number);
    // month is 1-indexed in dateString, but Date constructor expects 0-indexed for month
    // actually new Date(year, month, 0) gives last day of month.
    // if month is 12 (Dec), new Date(year, 12, 0) -> Jan 0 -> Dec 31. Correct.
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const currentDay = parseInt(date.split('-')[2]);
  const days = getDaysInMonth(viewDate);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Only scroll if the selected date is in the current view month
      if (date.substring(0, 7) === viewDate.substring(0, 7)) {
          const selectedDayEl = scrollRef.current.querySelector('.selected-day');
          if (selectedDayEl) {
            selectedDayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
      }
    }
  }, [date, viewDate]);

  const handleDayClick = (day) => {
    const [year, month] = viewDate.split('-').map(Number);
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newDateStr = `${year}-${monthStr}-${dayStr}`;
    
    setDate(newDateStr);
  };

  const handlePrevMonth = () => {
      const [year, month] = viewDate.split('-').map(Number);
      let newYear = year;
      let newMonth = month - 1;
      if (newMonth === 0) {
          newMonth = 12;
          newYear -= 1;
      }
      const newDateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
      setViewDate(newDateStr);
  };

  const handleNextMonth = () => {
      const [year, month] = viewDate.split('-').map(Number);
      let newYear = year;
      let newMonth = month + 1;
      if (newMonth === 13) {
          newMonth = 1;
          newYear += 1;
      }
      const newDateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
      setViewDate(newDateStr);
  };

  // Helper to check if a day has data
  const hasData = (day) => {
      const [year, month] = viewDate.split('-').map(Number);
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      return entriesWithData.has(dateStr);
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

      {/* Day Selector Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
            onClick={handlePrevMonth}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            title="Previous Month"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>

        <div 
            ref={scrollRef}
            className="day-selector-strip"
            style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            flex: 1,
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none',  /* IE 10+ */
            }}
        >
            {days.map(day => {
            const isSelected = day === currentDay && date.substring(0, 7) === viewDate.substring(0, 7);
            const hasEntry = hasData(day);
            
            return (
            <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={isSelected ? 'selected-day' : ''}
                style={{
                minWidth: '40px',
                height: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                border: isSelected ? 'none' : '1px solid var(--border-color)',
                fontWeight: isSelected ? '600' : '400',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                position: 'relative'
                }}
            >
                <span style={{ lineHeight: '1' }}>{day}</span>
                {hasEntry && (
                    <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#fff' : 'var(--accent-color)',
                        marginTop: '4px',
                        opacity: 0.8
                    }} />
                )}
            </div>
            )})}
        </div>

        <button 
            onClick={handleNextMonth}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            title="Next Month"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
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
        .day-selector-strip::-webkit-scrollbar { 
          display: none;  /* Chrome/Safari/Webkit */
        }
      `}</style>
    </div>
  );
};

export default WorkDiaryTab;
