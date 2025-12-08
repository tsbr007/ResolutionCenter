import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

const TodoTab = () => {
  const [todos, setTodos] = useState({
    current_day: [],
    next_day: [],
    pending: []
  });
  const [masterlist, setMasterlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
    fetchMasterlist();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/todos`);
      // Ensure structure matches expected
      const data = response.data;
      setTodos({
        current_day: data.current_day || [],
        next_day: data.next_day || [],
        pending: data.pending || []
      });
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch todos", err);
      setLoading(false);
    }
  };

  const fetchMasterlist = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/todos/masterlist`);
      setMasterlist(response.data);
    } catch (err) {
      console.error("Failed to fetch masterlist", err);
    }
  };

  const saveTodos = async (updatedTodos) => {
    try {
      await axios.post(`${config.API_URL}/api/todos`, updatedTodos);
    } catch (err) {
      console.error("Failed to save todos", err);
    }
  };

  const handleUpdate = (section, newItems) => {
    const updatedTodos = { ...todos, [section]: newItems };
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const handleMoveItem = (itemId, fromSection, toSection) => {
    const itemToMove = todos[fromSection].find(i => i.id === itemId);
    if (!itemToMove) return;

    const newFromList = todos[fromSection].filter(i => i.id !== itemId);
    const newToList = [...todos[toSection], itemToMove];

    const updatedTodos = {
      ...todos,
      [fromSection]: newFromList,
      [toSection]: newToList
    };
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const handleMoveAll = (fromSection, toSection) => {
    const itemsToMove = todos[fromSection];
    if (itemsToMove.length === 0) return;

    const newFromList = [];
    const newToList = [...todos[toSection], ...itemsToMove];

    const updatedTodos = {
      ...todos,
      [fromSection]: newFromList,
      [toSection]: newToList
    };
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const handleMoveUp = (section, index) => {
    if (index === 0) return;
    const newList = [...todos[section]];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    
    const updatedTodos = { ...todos, [section]: newList };
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const handleMoveDown = (section, index) => {
    if (index === todos[section].length - 1) return;
    const newList = [...todos[section]];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;

    const updatedTodos = { ...todos, [section]: newList };
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const calculateTotalDuration = (items) => {
    let totalMinutes = 0;
    items.forEach(item => {
      if (item.duration) {
        const parts = item.duration.match(/(\d+)\s*h/);
        const hours = parts ? parseInt(parts[1]) : 0;
        const partsMin = item.duration.match(/(\d+)\s*m/);
        const minutes = partsMin ? parseInt(partsMin[1]) : 0;
        totalMinutes += hours * 60 + minutes;
      }
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="todo-tab">
      <TodoSection 
        id="current_day"
        title={`Current Day (${new Date().toLocaleDateString()})`} 
        items={todos.current_day} 
        onUpdate={(items) => handleUpdate('current_day', items)}
        onMoveItem={handleMoveItem}
        onMoveAll={handleMoveAll}
        onMoveUp={(index) => handleMoveUp('current_day', index)}
        onMoveDown={(index) => handleMoveDown('current_day', index)}
        masterlist={masterlist}
        hasCheckbox={true}
        totalDuration={calculateTotalDuration(todos.current_day)}
      />
      <TodoSection 
        id="next_day"
        title="Next Day" 
        items={todos.next_day} 
        onUpdate={(items) => handleUpdate('next_day', items)}
        onMoveItem={handleMoveItem}
        onMoveAll={handleMoveAll}
        onMoveUp={(index) => handleMoveUp('next_day', index)}
        onMoveDown={(index) => handleMoveDown('next_day', index)}
        masterlist={masterlist}
        hasCheckbox={false}
        totalDuration={calculateTotalDuration(todos.next_day)}
      />
      <TodoSection 
        id="pending"
        title="Pending Items" 
        items={todos.pending} 
        onUpdate={(items) => handleUpdate('pending', items)}
        onMoveItem={handleMoveItem}
        onMoveAll={handleMoveAll}
        onMoveUp={(index) => handleMoveUp('pending', index)}
        onMoveDown={(index) => handleMoveDown('pending', index)}
        masterlist={masterlist}
        hasCheckbox={false}
        totalDuration={calculateTotalDuration(todos.pending)}
      />
    </div>
  );
};

const TodoSection = ({ id, title, items, onUpdate, onMoveItem, onMoveAll, onMoveUp, onMoveDown, masterlist, hasCheckbox, totalDuration }) => {
  const [newItem, setNewItem] = useState({ context: '', task: '', duration: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleAddItem = () => {
    console.log("Adding item:", newItem);
    if (!newItem.task.trim()) {
      alert("Please enter a task description");
      return;
    }

    let formattedDuration = newItem.duration;
    // If input is just numbers, treat as minutes and convert to Xh Ym
    if (formattedDuration && /^\d+$/.test(formattedDuration.trim())) {
      const mins = parseInt(formattedDuration);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      formattedDuration = `${h}h ${m}m`;
    }

    const item = {
      id: Date.now().toString(),
      ...newItem,
      duration: formattedDuration,
      completed: false
    };
    onUpdate([...items, item]);
    setNewItem({ context: '', task: '', duration: '' });
  };

  const handleDelete = (id) => {
    onUpdate(items.filter(item => item.id !== id));
  };

  const handleToggleComplete = (id) => {
    if (!hasCheckbox) return;
    onUpdate(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleTaskChange = (e) => {
    const value = e.target.value;
    setNewItem({ ...newItem, task: value });
    
    if (value.trim().length > 0) {
      const filtered = masterlist.filter(m => m.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setNewItem({ ...newItem, task: suggestion });
    setShowSuggestions(false);
  };

  const handleEditItem = (id, field, value) => {
    onUpdate(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="todo-section card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
          <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>{title}</h3>
          {id === 'next_day' && items.length > 0 && (
            <button 
              onClick={() => onMoveAll('next_day', 'current_day')}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 1rem',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(215, 30, 40, 0.2)'
              }}
            >
              Move All to Current
            </button>
          )}
        </div>
        <span className="duration-badge">Total: {totalDuration}</span>
      </div>
      
      <div className="todo-list">
        {items.map(item => (
          <div key={item.id} className={`todo-item ${item.completed ? 'completed' : ''}`}>
            {hasCheckbox && (
              <input 
                type="checkbox" 
                checked={item.completed} 
                onChange={() => handleToggleComplete(item.id)}
                className="todo-checkbox"
              />
            )}
            <input 
              className="todo-input context" 
              value={item.context} 
              onChange={(e) => handleEditItem(item.id, 'context', e.target.value)}
              placeholder="Context"
            />
            <input 
              className="todo-input task" 
              value={item.task} 
              onChange={(e) => handleEditItem(item.id, 'task', e.target.value)}
              placeholder="Task"
            />
            <input 
              className="todo-input duration" 
              value={item.duration} 
              onChange={(e) => handleEditItem(item.id, 'duration', e.target.value)}
              placeholder="Duration"
            />
            <div className="move-select-wrapper">
              <select
                className="move-select"
                value=""
                onChange={(e) => onMoveItem(item.id, id, e.target.value)}
              >
                <option value="" disabled>Move</option>
                {id !== 'current_day' && <option value="current_day">Current</option>}
                {id !== 'next_day' && <option value="next_day">Next</option>}
                {id !== 'pending' && <option value="pending">Pending</option>}
              </select>
            </div>
            <div className="sort-buttons">
              <button 
                className="sort-btn" 
                onClick={() => onMoveUp(items.indexOf(item))}
                disabled={items.indexOf(item) === 0}
                title="Move Up"
              >
                ↑
              </button>
              <button 
                className="sort-btn" 
                onClick={() => onMoveDown(items.indexOf(item))}
                disabled={items.indexOf(item) === items.length - 1}
                title="Move Down"
              >
                ↓
              </button>
            </div>
            <button className="delete-btn" onClick={() => handleDelete(item.id)}>&times;</button>
          </div>
        ))}
      </div>

      <div className="add-item-row">
        <input 
          className="todo-input context" 
          value={newItem.context} 
          onChange={(e) => setNewItem({ ...newItem, context: e.target.value })}
          placeholder="Context"
        />
        <div style={{ position: 'relative', flex: 2 }}>
          <input 
            className="todo-input task" 
            value={newItem.task} 
            onChange={handleTaskChange}
            placeholder="Task"
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((s, idx) => (
                <div key={idx} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <input 
          className="todo-input duration" 
          value={newItem.duration} 
          onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
          placeholder="Mins"
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <button type="button" className="add-btn" onClick={handleAddItem}>+</button>
      </div>

      <style>{`
        .move-select {
          appearance: none;
          background-color: transparent;
          border: 1px solid transparent;
          border-radius: 9999px;
          padding: 0.25rem 1.5rem 0.25rem 0.75rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 0.65em auto;
          transition: all 0.2s;
          font-weight: 500;
        }
        .move-select:hover {
          background-color: rgba(0,0,0,0.05);
          color: var(--text-primary);
        }
        .move-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }
        .todo-item:hover .move-select {
          border-color: var(--border-color);
        }
        .sort-buttons {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 0 0.5rem;
        }
        .sort-btn {
          background: none;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 0.7rem;
          padding: 0 0.2rem;
          color: var(--text-secondary);
          border-radius: 3px;
          line-height: 1;
        }
        .sort-btn:hover:not(:disabled) {
          background-color: rgba(0,0,0,0.05);
          color: var(--text-primary);
        }
        .sort-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }
      `}</style>
    </div>
  );
};

export default TodoTab;
