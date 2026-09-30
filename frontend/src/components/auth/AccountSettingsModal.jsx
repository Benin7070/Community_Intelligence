import React, { useState } from 'react';
import { AUTH_API } from '../../config';

export default function AccountSettingsModal({ user, onClose }) {
  const [mode, setMode] = useState('idle'); // 'idle', 'request_otp', 'reset_form'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleRequestOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        setMode('reset_form');
      } else {
        setError(data.detail || 'Failed to request OTP');
      }
    } catch (err) {
      setError('Network error requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Typically an API would have a specific reset-password endpoint
      // Using /register as placeholder as we don't have the explicit reset API in view
      const res = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: newPassword, otp })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Password updated successfully!");
        setMode('idle');
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-settings-modal" style={{ display: 'flex' }}>
      <div className="modal-header">
        <div className="modal-title-box">
          <div className="header-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.2px' }}>Account Settings</h3>
            <p style={{ margin: '2px 0 0', color: '#a1a1aa', fontSize: '12px' }}>Manage credentials, security protocols, and preferences</p>
          </div>
        </div>
        <button type="button" className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="account-modal-body">
        {/* User Profile Card */}
        <div className="account-profile-card">
          <div className="account-avatar-large">{user.email.charAt(0).toUpperCase()}</div>
          <div className="account-details">
            <h4>{user.email.split('@')[0]}</h4>
            <p>{user.email}</p>
            <div className="account-badge-row">
              <span className="badge-tag layer3-tag">{user.role.toUpperCase()}</span>
              <span className="account-status-pill"><span className="white-pulse-dot"></span> Active Session</span>
            </div>
          </div>
        </div>

        {/* Security & Password Reset Section */}
        <div className="account-section-card">
          <div className="account-section-header">
            <div className="section-icon-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <h4 className="section-title">Password & Authentication</h4>
              <p className="section-subtitle">Reset your account password with two-factor email OTP verification</p>
            </div>
          </div>

          {success && (
            <div className="auth-status-banner" style={{ borderLeftColor: '#10b981' }}>
              <span style={{ color: '#10b981' }}>{success}</span>
            </div>
          )}

          {error && (
            <div className="auth-status-banner" style={{ borderLeftColor: '#ef4444' }}>
              <span style={{ color: '#ef4444' }}>{error}</span>
            </div>
          )}

          {mode === 'idle' && (
            <div className="auth-status-banner">
              <div className="status-banner-left">
                <div className="status-icon-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="status-banner-title">Password Configured</div>
                  <div className="status-banner-desc">You can sign in with your password or one-time email OTP.</div>
                </div>
              </div>
              <button type="button" className="change-pwd-btn" onClick={() => setMode('request_otp')}>
                Change Password
              </button>
            </div>
          )}

          <div className="password-reset-flow-container">
            {mode === 'request_otp' && (
              <div className="reset-substep">
                <p className="reset-prompt-text">
                  To set a new password, click below to receive a secure 6-digit verification code at <strong>{user.email}</strong>.
                </p>
                <button type="button" className="admin-action-btn primary" style={{ width: 'auto' }} onClick={handleRequestOtp} disabled={loading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>
                  <span>{loading ? 'Sending...' : 'Request Verification Code (OTP)'}</span>
                </button>
                <button type="button" className="admin-action-btn secondary" style={{ marginLeft: '10px' }} onClick={() => setMode('idle')}>Cancel</button>
              </div>
            )}

            {mode === 'reset_form' && (
              <form className="reset-substep" autoComplete="off" onSubmit={handleSubmitReset}>
                <div className="reset-notice-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>A 6-digit verification code was dispatched to your email. Enter the code and your new password.</span>
                </div>

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="accountResetOtp" className="chatgpt-label">6-Digit Verification Code</label>
                  <div className="otp-input-with-action">
                    <input type="text" id="accountResetOtp" maxLength="6" inputMode="numeric" placeholder="000000" className="chatgpt-input chatgpt-otp-field" required value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} disabled={loading} />
                    <button type="button" className="otp-send-code-btn" onClick={handleRequestOtp} disabled={loading}>Resend code</button>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="accountResetNewPassword" className="chatgpt-label">New Password (min 6 characters)</label>
                  <div className="input-focus-container">
                    <input type={showNewPassword ? 'text' : 'password'} id="accountResetNewPassword" minLength="6" placeholder="Enter new password" className="chatgpt-input" required value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={loading} />
                    <button type="button" className="password-toggle-btn" title="Toggle password visibility" onClick={() => setShowNewPassword(!showNewPassword)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="accountResetConfirmPassword" className="chatgpt-label">Confirm New Password</label>
                  <div className="input-focus-container">
                    <input type={showConfirmPassword ? 'text' : 'password'} id="accountResetConfirmPassword" minLength="6" placeholder="Re-enter new password" className="chatgpt-input" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
                    <button type="button" className="password-toggle-btn" title="Toggle password visibility" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '18px' }}>
                  <button type="button" className="admin-action-btn secondary" onClick={() => setMode('idle')} disabled={loading}>Cancel</button>
                  <button type="submit" className="admin-action-btn primary" disabled={loading}>{loading ? 'Verifying...' : 'Verify Code & Update Password'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
