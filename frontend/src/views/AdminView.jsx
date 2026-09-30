import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { animatePanelEntrance } from '../utils/motion';
import SystemHealthView from './admin/SystemHealthView';
import UserPreferencesView from './admin/UserPreferencesView';
import { API_BASE } from '../config';

export default function AdminView({ subView = 'admin' }) {
  const { user: currentUser } = useAuth();
  const panelRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const [auditLogs, setAuditLogs] = useState([
    { time: 'Live', desc: 'Admin governance session active. Telemetry stream connected.' }
  ]);

  // Provision Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('normal');
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState('');

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast({ show: false, message: '', isError: false });
    }, 3500);
  };

  const addAuditLog = (desc) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [{ time, desc }, ...prev]);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          showToast('Administrative privileges required to access user directory.', true);
          return;
        }
        throw new Error('Failed to retrieve user directory.');
      }

      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'normal' : 'admin';
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update role.');
      }

      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
      showToast(`Account #${userId} updated to ${newRole.toUpperCase()}`);
      addAuditLog(`User #${userId} role changed to ${newRole.toUpperCase()}`);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to remove account #USR-${userId}?`)) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete user.');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`Account #${userId} removed successfully`);
      addAuditLog(`Account #${userId} removed from directory`);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setProvisionLoading(true);
    setProvisionError('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to provision account.');
      }

      const newUser = await res.json();
      setUsers(prev => [...prev, newUser]);
      showToast(`Provisioned account for ${newEmail}`);
      addAuditLog(`Provisioned user ${newEmail} as ${newRole.toUpperCase()}`);
      setShowAddModal(false);
      setNewEmail('');
      setNewRole('normal');
    } catch (err) {
      setProvisionError(err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  // KPIs
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const normalCount = users.filter(u => u.role === 'normal').length;

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesFilter = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch = !searchTerm || (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // If viewing admin-preferences (User Preferences & Model Evaluation)
  if (subView === 'admin-preferences') {
    return (
      <section className="view-panel active" id="viewAdmin-preferences" ref={panelRef}>
        <UserPreferencesView />
      </section>
    );
  }

  // If viewing admin-health (System Check)
  if (subView === 'admin-health') {
    return (
      <section className="view-panel active" id="viewAdmin-health">
        <SystemHealthView />
      </section>
    );
  }

  // If viewing admin-audit
  if (subView === 'admin-audit') {
    return (
      <section className="view-panel active" id="viewAdmin-audit" ref={panelRef}>
        <div className="console-grid" style={{ display: 'block' }}>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div className="header-icon-box cyan">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="card-title">System Audit Logs</h3>
                <span className="card-subtitle">Activity monitoring and security events</span>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="adminAuditTableBody">
                  {auditLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}>{log.time}</td>
                      <td>{currentUser?.email || 'admin@intel.ci'}</td>
                      <td>{log.desc}</td>
                      <td><code>/api/v1/auth</code></td>
                      <td><span className="status-indicator-tag online">Recorded</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default User Management View
  return (
    <section className="view-panel active" id="viewAdmin" ref={panelRef}>
      {toast.show && (
        <div className={`admin-toast ${toast.isError ? 'error' : 'success'}`} style={{ display: 'flex' }}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-view-container">
        {/* Top Header */}
        <div className="admin-header-strip glass-card">
          <div className="admin-header-info">
            <div className="admin-badge-strip">
              <span className="admin-live-badge"><span className="pulse-dot"></span> Admin Control Center</span>
              <span className="db-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 20 6.48 22 12 22s10-2 10-4.5v-11C22 4.02 17.52 2 12 2z"/><path d="M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5"/><path d="M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5"/>
                </svg>
                Supabase PostgreSQL
              </span>
            </div>
            <h2 className="admin-main-title">Access Governance & User Delegation</h2>
            <p className="admin-main-desc">Manage system roles, oversee platform access policies, and audit community research permissions.</p>
          </div>
          <div className="admin-header-actions">
            <button
              id="adminRefreshUsersBtn"
              className={`admin-action-btn secondary ${loading ? 'spinning' : ''}`}
              title="Refresh Users"
              onClick={fetchUsers}
            >
              <svg className="refresh-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>Refresh</span>
            </button>
            <button
              id="openAddUserModalBtn"
              className="admin-action-btn primary"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>Provision User</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="admin-kpi-grid">
          <div className="admin-kpi-card glass-card">
            <div className="kpi-icon-box users">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Total Accounts</span>
              <span className="kpi-value">{totalCount}</span>
              <span className="kpi-subtext">Supabase auth directory</span>
            </div>
          </div>

          <div className="admin-kpi-card glass-card">
            <div className="kpi-icon-box admins">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Administrators</span>
              <span className="kpi-value">{adminCount}</span>
              <span className="kpi-subtext">Full system governance</span>
            </div>
          </div>

          <div className="admin-kpi-card glass-card">
            <div className="kpi-icon-box members">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Standard Users</span>
              <span className="kpi-value">{normalCount}</span>
              <span className="kpi-subtext">Console & pipeline query</span>
            </div>
          </div>

          <div className="admin-kpi-card glass-card">
            <div className="kpi-icon-box security">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Security Protocol</span>
              <span className="kpi-value status-active">RBAC ACTIVE</span>
              <span className="kpi-subtext">JWT • SHA-256 OTP (10m)</span>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="admin-table-card glass-card">
          <div className="admin-table-toolbar">
            <div className="admin-search-wrapper">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Filter users by email address..."
                className="admin-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="admin-role-filter-group">
              <button
                className={`admin-filter-pill ${roleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRoleFilter('all')}
              >
                All ({totalCount})
              </button>
              <button
                className={`admin-filter-pill ${roleFilter === 'admin' ? 'active' : ''}`}
                onClick={() => setRoleFilter('admin')}
              >
                Admins ({adminCount})
              </button>
              <button
                className={`admin-filter-pill ${roleFilter === 'normal' ? 'active' : ''}`}
                onClick={() => setRoleFilter('normal')}
              >
                Standard ({normalCount})
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="modern-admin-table">
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>Current Role</th>
                  <th>Access Scope</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Role Delegation & Action</th>
                </tr>
              </thead>
              <tbody id="adminUsersTableBody">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="table-empty">Loading users from DataBase directory...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="table-empty">No accounts match the selected filter.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isMe = u.email === currentUser?.email;
                    const isAdmin = u.role === 'admin';
                    const initials = (u.email.substring(0, 2) || 'US').toUpperCase();
                    const avatarBg = isAdmin ? '#ffffff' : 'rgba(255, 255, 255, 0.12)';
                    const avatarColor = isAdmin ? '#000000' : '#ffffff';
                    const avatarBorder = isAdmin ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)';

                    return (
                      <tr className="admin-user-row" key={u.id}>
                        <td>
                          <div className="user-identity-cell">
                            <div
                              className="user-avatar-mini"
                              style={{
                                background: avatarBg,
                                color: avatarColor,
                                border: avatarBorder,
                                fontWeight: 700
                              }}
                            >
                              {initials}
                            </div>
                            <div className="user-email-col">
                              <span className="user-email-text">{u.email}</span>
                              <div className="user-meta-tags">
                                <span className="user-id-tag">#USR-{u.id}</span>
                                {isMe && <span className="you-badge">Active Session</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isAdmin ? (
                            <span className="role-pill admin">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              </svg> Admin
                            </span>
                          ) : (
                            <span className="role-pill normal">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                              </svg> Standard
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="scope-text">
                            {isAdmin ? 'Full Governance & Ingestion' : 'Query & Provenance Lineage'}
                          </span>
                        </td>
                        <td>
                          <span className="status-indicator-tag online">
                            <span className="pulse-tiny"></span>
                            {u.has_password ? 'Password & OTP' : 'OTP Verified'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-btn-group">
                            {isMe ? (
                              <span className="protected-pill" title="Cannot demote or delete your active session">
                                Protected (You)
                              </span>
                            ) : (
                              <>
                                <button
                                  className={`role-toggle-btn ${isAdmin ? 'demote' : 'promote'}`}
                                  onClick={() => handleToggleRole(u.id, u.role)}
                                  title={isAdmin ? 'Demote to Standard' : 'Promote to Admin'}
                                >
                                  {isAdmin ? 'Demote to Standard' : 'Promote to Admin'}
                                </button>
                                <button
                                  className="user-delete-btn"
                                  onClick={() => handleDeleteUser(u.id)}
                                  title="Delete Account"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Telemetry & Audit Strip */}
        <div className="admin-telemetry-grid">
          <div className="glass-card telemetry-card">
            <div className="card-header">
              <div className="header-icon-box purple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div>
                <h3 className="card-title">Database & Infrastructure Status</h3>
                <span className="card-subtitle">Supabase Cloud Managed Postgres</span>
              </div>
            </div>
            <div className="telemetry-list">
              <div className="telemetry-row">
                <span className="telemetry-key">Database Engine</span>
                <span className="telemetry-val">PostgreSQL 15 (Supabase Pooler)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-key">Session Policy</span>
                <span className="telemetry-val">Bearer JWT (24 Hours TTL)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-key">OTP Authentication</span>
                <span className="telemetry-val">Cryptographic 6-Digit Random (10m)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-key">Connection Pool</span>
                <span className="telemetry-val status-ok">Connected • Port 6543</span>
              </div>
            </div>
          </div>

          <div className="glass-card audit-card">
            <div className="card-header">
              <div className="header-icon-box cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className="card-title">Live Security Audit Log</h3>
                <span className="card-subtitle">Real-time governance telemetry</span>
              </div>
            </div>
            <div className="audit-log-stream" id="adminAuditLogStream">
              {auditLogs.map((log, idx) => (
                <div className="audit-entry" key={idx}>
                  <span className="audit-time">{log.time}</span>
                  <span className="audit-desc">{log.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Provision User Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" style={{ display: 'flex' }}>
          <div className="admin-modal glass-card">
            <div className="modal-header">
              <div className="modal-title-box">
                <div className="header-icon-box pink">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </div>
                <h3>Provision Platform Account</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close"
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="modal-form" autoComplete="off">
              <div className="form-group">
                <label className="chatgpt-label">User Email Address</label>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  required
                  className="chatgpt-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={provisionLoading}
                />
              </div>

              <div className="form-group">
                <label className="chatgpt-label">Initial Role Assignment</label>
                <select
                  className="chatgpt-input chatgpt-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={provisionLoading}
                >
                  <option value="normal">Standard User (Research Console Access)</option>
                  <option value="admin">Administrator (Governance & Full Access)</option>
                </select>
              </div>

              {provisionError && (
                <div className="chatgpt-alert-box" style={{ display: 'flex', marginTop: '0.5rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{provisionError}</span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-action-btn secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={provisionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-action-btn primary"
                  disabled={provisionLoading}
                >
                  {provisionLoading ? 'Creating...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
