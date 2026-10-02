import React from 'react';
import { usePipeline } from '../context/PipelineContext';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, PlusCircle } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, navGroup, setNavGroup }) {
  const { historyList, loadChat, activeChatId, startNewChat } = usePipeline();
  const { user } = useAuth();
  return (
    <aside className="app-sidebar" aria-label="Main Navigation">
      <div className="sidebar-brand">
        <div className="brand-glyph">
          <span className="glyph-core">CI</span>
          <div className="glyph-glow"></div>
        </div>
        <div className="brand-text">
          <h2>Community Intel</h2>
          <span className="brand-badge">IEEE Conf. Arch</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navGroup === 'main' ? (
          <div id="mainNavGroup">
            <button
              className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <div className="nav-label">
                <span>Live Console</span>
                <small>Query & Pipeline</small>
              </div>
            </button>

            {/* NEW CHAT BUTTON */}
            <button
              className="nav-btn"
              onClick={() => {
                setCurrentView('dashboard');
                startNewChat();
              }}
              style={{ marginTop: '8px', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
            >
              <PlusCircle className="nav-icon" size={20} />
              <div className="nav-label">
                <span>New Chat</span>
                <small>Start fresh session</small>
              </div>
            </button>

            {/* CHAT HISTORY SECTION */}
            {historyList && historyList.length > 0 && (
              <div className="chat-history-section" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div style={{ padding: '0 14px', fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Recent Chats
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {historyList.map(chat => (
                    <button
                      key={chat.id}
                      className={`nav-btn ${activeChatId === chat.id && currentView === 'dashboard' ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentView('dashboard');
                        loadChat(chat.id);
                      }}
                      style={{ padding: '8px 14px', gap: '10px' }}
                      title={chat.title}
                    >
                      <MessageSquare className="nav-icon" size={16} color={activeChatId === chat.id ? '#38bdf8' : '#71717a'} />
                      <div className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <span style={{ fontSize: '12.5px', fontWeight: activeChatId === chat.id ? 600 : 400 }}>
                          {chat.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0' }} />

            <button
              className={`nav-btn ${currentView === 'provenance' ? 'active' : ''}`}
              onClick={() => setCurrentView('provenance')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="12" cy="18" r="3"></circle>
                <line x1="8.5" y1="7.5" x2="15.5" y2="7.5"></line>
                <line x1="7.5" y1="8.5" x2="10.5" y2="15.5"></line>
                <line x1="16.5" y1="8.5" x2="13.5" y2="15.5"></line>
              </svg>
              <div className="nav-label">
                <span>Provenance Graph</span>
                <small>Layer 4 Knowledge</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'architecture' ? 'active' : ''}`}
              onClick={() => setCurrentView('architecture')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              <div className="nav-label">
                <span>System Blueprint</span>
                <small>6-Layer Architecture</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'conflicts' ? 'active' : ''}`}
              onClick={() => setCurrentView('conflicts')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <div className="nav-label">
                <span>Conflict & Uncertainty</span>
                <small>Bayesian Calibration</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'sources' ? 'active' : ''}`}
              onClick={() => setCurrentView('sources')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
              <div className="nav-label">
                <span>Data Sources</span>
                <small>SO • GitHub • Reddit</small>
              </div>
            </button>

            {user?.role === 'admin' && (
              <button
                className="nav-btn admin-only"
                onClick={() => {
                  setNavGroup('admin');
                  setCurrentView('admin');
                }}
              >
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <div className="nav-label">
                  <span>Admin Dashboard</span>
                  <small>Manage Users & Roles</small>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div id="adminNavGroup">
            <button
              className="nav-btn nav-back-btn"
              onClick={() => {
                setNavGroup('main');
                setCurrentView('dashboard');
              }}
              style={{ marginBottom: '12px' }}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              <div className="nav-label">
                <span>Back to Main App</span>
                <small>Return to live console</small>
              </div>
            </button>

            <div
              className="nav-section-title"
              style={{
                margin: '16px 12px 8px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#a1a1aa',
                fontWeight: 600
              }}
            >
              Admin Console
            </div>

            <button
              className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <div className="nav-label">
                <span>User Management</span>
                <small>RBAC & Delegation</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'admin-preferences' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin-preferences')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <div className="nav-label">
                <span>User Preferences</span>
                <small>Model Arena & Locked Votes</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'admin-audit' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin-audit')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <div className="nav-label">
                <span>System Audit Logs</span>
                <small>Security & Ingestion</small>
              </div>
            </button>

            <button
              className={`nav-btn ${currentView === 'admin-health' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin-health')}
            >
              <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <div className="nav-label">
                <span>System Check</span>
                <small>SMTP2GO & Supabase (10m)</small>
              </div>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
