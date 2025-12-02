import { useState } from 'react';
import FormattersTab from './components/FormattersTab';
import NotesTab from './components/NotesTab';
import ProblemSolver from './components/ProblemSolver';
import SearchTab from './components/SearchTab';
import SnippetsTab from './components/SnippetsTab';
import TemplatesTab from './components/TemplatesTab';
import TodoTab from './components/TodoTab';
import WorkDiaryTab from './components/WorkDiaryTab';
import WorldClockTab from './components/WorldClockTab';

function App() {
  const [activeTab, setActiveTab] = useState('todo');

  const renderContent = () => {
    switch (activeTab) {
      case 'todo':
        return <TodoTab />;
      case 'problem-solver':
        return <ProblemSolver />;
      case 'search':
        return <SearchTab />;
      case 'formatters':
        return <FormattersTab />;
      case 'snippets':
        return <SnippetsTab />;
      case 'templates':
        return <TemplatesTab />;
      case 'world-clock':
        return <WorldClockTab />;
      case 'work-diary':
        return <WorkDiaryTab />;
      case 'notes':
        return <NotesTab />;
      default:
        return <TodoTab />;
    }
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

      <div className="tab-nav-container">
        <div className="container">
          <div className="tab-nav">
            <button 
              className={`tab-btn ${activeTab === 'todo' ? 'active' : ''}`}
              onClick={() => setActiveTab('todo')}
            >
              Todo
            </button>
            <button 
              className={`tab-btn ${activeTab === 'problem-solver' ? 'active' : ''}`}
              onClick={() => setActiveTab('problem-solver')}
            >
              Problem Solver
            </button>
            <button 
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search
            </button>
            <button 
              className={`tab-btn ${activeTab === 'formatters' ? 'active' : ''}`}
              onClick={() => setActiveTab('formatters')}
            >
              Formatters
            </button>
            <button 
              className={`tab-btn ${activeTab === 'snippets' ? 'active' : ''}`}
              onClick={() => setActiveTab('snippets')}
            >
              Snippets
            </button>
            <button 
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              Templates
            </button>
            <button 
              className={`tab-btn ${activeTab === 'world-clock' ? 'active' : ''}`}
              onClick={() => setActiveTab('world-clock')}
            >
              World Clock
            </button>
            <button 
              className={`tab-btn ${activeTab === 'work-diary' ? 'active' : ''}`}
              onClick={() => setActiveTab('work-diary')}
            >
              Work Diary
            </button>
            <button 
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </button>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="container">
          {renderContent()}
        </div>
      </div>
      <div className="app-footer">Developed by Balaji Rajan T S</div>
    </div>
  );
}

export default App;
