import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PipelineProvider } from './context/PipelineContext';
import AuthOverlay from './components/AuthOverlay';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './views/DashboardView';
import ProvenanceView from './views/ProvenanceView';
import ArchitectureView from './views/ArchitectureView';
import ConflictsView from './views/ConflictsView';
import SourcesView from './views/SourcesView';
import AdminView from './views/AdminView';

function AppContent() {
  const { user, loading, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [navGroup, setNavGroup] = useState('main'); // 'main' or 'admin'

  if (loading) return null;

  if (!user) {
    return <AuthOverlay onLogin={login} />;
  }

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        navGroup={navGroup}
        setNavGroup={setNavGroup}
      />
      <div className="app-main">
        <Header user={user} onLogout={logout} currentView={currentView} />
        <main className="app-content-body">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'provenance' && <ProvenanceView />}
          {currentView === 'architecture' && <ArchitectureView />}
          {currentView === 'conflicts' && <ConflictsView />}
          {currentView === 'sources' && <SourcesView />}
          {(currentView === 'admin' || currentView === 'admin-audit' || currentView === 'admin-health' || currentView === 'admin-preferences') && user?.role === 'admin' && (
            <AdminView subView={currentView} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PipelineProvider>
        <AppContent />
      </PipelineProvider>
    </AuthProvider>
  );
}
