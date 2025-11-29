import { useState } from 'react';
import Dashboard from './Dashboard';
import EntryForm from './EntryForm';

const ProblemSolver = () => {
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
    <div className="problem-solver-tab">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
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
  );
};

export default ProblemSolver;
