import { useState } from 'react';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [entryToEdit, setEntryToEdit] = useState(null);

  const handleEntrySaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setEntryToEdit(null); // Clear edit mode after save
  };

  const handleEdit = (entry) => {
    setEntryToEdit(entry);
    // Smooth scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEntryToEdit(null);
  };

  return (
    <div className="app">
      <h1>Resolution Center</h1>
      <div className="container">
        <EntryForm 
          onEntrySaved={handleEntrySaved} 
          entryToEdit={entryToEdit}
          onCancelEdit={handleCancelEdit}
        />
        <Dashboard 
          refreshTrigger={refreshTrigger} 
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}

export default App;
