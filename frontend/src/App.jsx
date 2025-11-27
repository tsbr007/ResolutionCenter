import { useState } from 'react';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  const handleEntrySaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setEntryToEdit(null); // Clear edit mode after save
    setIsModalOpen(false); // Close modal
    setViewMode(false);
  };

  const handleEdit = (entry) => {
    setEntryToEdit(entry);
    setViewMode(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (entry) => {
    setEntryToEdit(entry);
    setViewMode(true);
    setIsModalOpen(true);
  };

  const handleSwitchToEdit = () => {
    setViewMode(false);
  };

  const handleCancelEdit = () => {
    setEntryToEdit(null);
    setIsModalOpen(false);
    setViewMode(false);
  };

  const openNewEntryModal = () => {
    setEntryToEdit(null);
    setViewMode(false);
    setIsModalOpen(true);
  };

  return (
    <div className="app">
      <header className="wf-header">
        <div className="header-left">
          <span className="brand-text">WELLS FARGO</span>
        </div>
        <div className="header-right">
          <nav className="utility-nav">
            <a href="#">ATMs/Locations</a>
            <a href="#">Help</a>
            <a href="#">Español</a>
          </nav>
          <button className="search-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          <button className="sign-on-btn">Sign On</button>
        </div>
      </header>
      <div className="main-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={openNewEntryModal}
              className="record-issue-btn"
            >
              + New
            </button>
          </div>

          <Dashboard 
            refreshTrigger={refreshTrigger} 
            onEdit={handleEdit}
            onRowClick={handleRowClick}
          />

          {isModalOpen && (
            <div className="modal-overlay" onClick={handleCancelEdit}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={handleCancelEdit}>&times;</button>
                <EntryForm 
                  onEntrySaved={handleEntrySaved} 
                  entryToEdit={entryToEdit}
                  onCancelEdit={handleCancelEdit}
                  viewMode={viewMode}
                  onEdit={handleSwitchToEdit}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="app-footer">Developed by Balaji Rajan T S</div>
    </div>
  );
}

export default App;
