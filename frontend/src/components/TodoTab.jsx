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
        title={`Current Day (${new Date().toLocaleDateString()})`} 
        items={todos.current_day} 
        onUpdate={(items) => handleUpdate('current_day', items)}
        masterlist={masterlist}
        hasCheckbox={true}
        totalDuration={calculateTotalDuration(todos.current_day)}
      />
      <TodoSection 
        title="Next Day" 
        items={todos.next_day} 
        onUpdate={(items) => handleUpdate('next_day', items)}
        masterlist={masterlist}
        hasCheckbox={false}
        totalDuration={calculateTotalDuration(todos.next_day)}
      />
      <TodoSection 
        title="Pending Items" 
        items={todos.pending} 
        onUpdate={(items) => handleUpdate('pending', items)}
        masterlist={masterlist}
        hasCheckbox={false}
        totalDuration={calculateTotalDuration(todos.pending)}
      />
    </div>
  );
};

const TodoSection = ({ title, items, onUpdate, masterlist, hasCheckbox, totalDuration }) => {
  const [newItem, setNewItem] = useState({ context: '', task: '', duration: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleAddItem = () => {
    if (!newItem.task) return;
    const item = {
      id: Date.now().toString(),
      ...newItem,
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
        <h3>{title}</h3>
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
          placeholder="Duration (e.g. 1h 30m)"
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <button className="add-btn" onClick={handleAddItem}>+</button>
      </div>
    </div>
  );
};

export default TodoTab;
