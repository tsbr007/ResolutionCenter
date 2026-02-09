import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import config from '../config';

const WorkDiaryTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [entriesWithData, setEntriesWithData] = useState(new Map());
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);

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
        // Response is now array of { date, preview }
        const dataMap = new Map();
        response.data.forEach(item => {
            dataMap.set(item.date, item.preview);
        });
        setEntriesWithData(dataMap);
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
          // Update the map with new preview
          const words = entryContent.split(/\s+/);
          let preview = words.slice(0, 50).join(' ');
          if (words.length > 50) preview += '...';
          
          setEntriesWithData(prev => {
              const newMap = new Map(prev);
              newMap.set(selectedDate, preview);
              return newMap;
          });
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
      setStatus('Error saving');
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchInput(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!query.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
        try {
            const response = await axios.get(`${config.API_URL}/api/diary-search`, {
                params: { q: query }
            });
            setSearchResults(response.data);
            setShowResults(true);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, 300);
  };

  const handleSearchResultClick = (result) => {
      setDate(result.date);
      // setViewDate will be updated by the useEffect listening to 'date'
      setSearchInput('');
      setShowResults(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
      const handleClickOutside = (e) => {
          if (!e.target.closest('.search-container')) {
              setShowResults(false);
          }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
  const getEntryPreview = (day) => {
      const [year, month] = viewDate.split('-').map(Number);
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      return entriesWithData.get(dateStr);
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Work Diary</h2>
            
            {/* Search Box */}
            <div className="search-container" style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search diary..."
                    value={searchInput}
                    onChange={handleSearch}
                    style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        width: '200px',
                        backgroundColor: 'var(--bg-color)',
                        color: 'var(--text-primary)'
                    }}
                    onFocus={() => searchInput && setShowResults(true)}
                />
                
                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '300px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        marginTop: '0.5rem'
                    }}>
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                onClick={() => handleSearchResultClick(result)}
                                style={{
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    borderBottom: index < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{result.date}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.snippet}</div>
                            </div>
                        ))}
                    </div>
                )}
                 {showResults && searchResults.length === 0 && searchInput && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '200px',
                        padding: '0.5rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        zIndex: 1000,
                        marginTop: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        No results found
                    </div>
                )}
            </div>
        </div>
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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '1rem', 
        width: '100%' 
      }}>
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
                justifyContent: 'center',
                flexShrink: 0 // Prevent button shrinking
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
            width: '100%',
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none',  /* IE 10+ */
            }}
        >
            {days.map(day => {
            const isSelected = day === currentDay && date.substring(0, 7) === viewDate.substring(0, 7);
            const preview = getEntryPreview(day);
            const hasEntry = preview !== undefined && preview !== '';
            
            return (
            <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={isSelected ? 'selected-day' : ''}
                title={hasEntry ? preview : undefined}
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
                justifyContent: 'center',
                flexShrink: 0 // Prevent button shrinking
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
