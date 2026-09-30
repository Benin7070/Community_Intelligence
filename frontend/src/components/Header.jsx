import React, { useState, useEffect, useRef } from 'react';
import AccountSettingsModal from './auth/AccountSettingsModal';

export default function Header({ user, onLogout, currentView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // Derive title from currentView (mirroring VIEW_METADATA)
  const viewMap = {
    'dashboard': { title: 'Live Intelligence Console', sub: 'Multi-source developer knowledge synthesis with probabilistic consensus modeling' },
    'provenance': { title: 'Claim-Source Provenance Graph (Layer 4)', sub: 'Traceable lineage network linking queries, source posts, extracted claims, and evidence' },
    'architecture': { title: 'System Blueprint & 6-Layer Architecture', sub: 'Interactive technical specification mirroring safe_docs/fyp_architecture_updated.png' },
    'conflicts': { title: 'Conflict & Bayesian Uncertainty Matrix', sub: 'Mathematical quantification of consensus agreement, contradictory claims, and abstention guards' },
    'sources': { title: 'Heterogeneous Community Data Coverage', sub: 'Real-time telemetry of multi-platform post ingestion and author credibility scoring (Eq 1)' },
    'admin': { title: 'Admin Governance & User Delegation', sub: 'Manage system roles, oversee platform access policies, and audit community research permissions' },
    'admin-audit': { title: 'System Audit Logs', sub: 'Monitor user actions, system modifications, and access events' },
    'admin-preferences': { title: 'User Preferences & Model Evaluation Arena (Layer 6)', sub: 'Audit comparative user choices, competitor baselines (OpenAI, Claude, Gemini), dual latencies, and locked votes' },
    'admin-health': { title: 'System Health & Infrastructure Diagnostics', sub: 'Live connectivity telemetry for Supabase PostgreSQL, SMTP2GO, and Core Pipeline with 10-minute auto-check' }
  };
  const { title, sub } = viewMap[currentView] || { title: currentView, sub: '' };
  
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="view-title">{title}</h1>
        <p className="view-subtitle">{sub}</p>
      </div>
      <div className="header-right">
        <div className="user-menu-wrapper" ref={menuRef}>
          <button 
            type="button" 
            className="user-avatar-trigger" 
            aria-expanded={menuOpen} 
            title="Account Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="user-avatar-circle">{userInitial}</div>
            <div className="user-avatar-info">
              <span className="user-name-display">{userName}</span>
              <span className="badge-tag user-role-pill">{user?.role?.toUpperCase() || 'USER'}</span>
            </div>
            <svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {menuOpen && (
            <div className="user-dropdown-card" style={{ display: 'block', position: 'absolute', top: '100%', right: '0', zIndex: 50 }}>
              <div className="dropdown-header">
                <div className="dropdown-user-name">{userName}</div>
                <div className="dropdown-user-email">{user?.email}</div>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-menu-list">
                <button type="button" className="dropdown-item" onClick={() => { setShowSettings(true); setMenuOpen(false); }}>
                  <svg className="dropdown-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Account Settings</span>
                </button>
              </div>
              <div className="dropdown-divider"></div>
              <button type="button" className="dropdown-item signout-btn" onClick={onLogout}>
                <svg className="dropdown-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <AccountSettingsModal 
          user={user} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </header>
  );
}
