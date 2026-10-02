import React, { useState } from 'react';
import { AUTH_API } from '../../config';

export default function AuthPasswordStep({ email, onEditEmail, onLoginSuccess, onSwitchToOtp, onError }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.user);
      } else {
        onError(data.detail || 'Invalid password');
      }
    } catch (err) {
      onError('Network error while logging in');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        onSwitchToOtp();
      } else {
        onError(data.detail || 'Failed to request OTP');
      }
    } catch (err) {
      onError('Network error while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatgpt-step-flow">
      <h1 className="chatgpt-auth-title">Welcome back</h1>
      <div className="chatgpt-email-indicator">
        <span>Signing in as <strong>{email}</strong></span>
        <button type="button" className="chatgpt-link-action" onClick={onEditEmail} title="Change email">Edit</button>
      </div>

      <form className="chatgpt-form" onSubmit={handleSubmit} autoComplete="on">
        <div className="chatgpt-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="authLoginPassword" className="chatgpt-label" style={{ marginBottom: 0 }}>Password</label>
          </div>
          <div className="input-focus-container">
            <input 
              type={showPassword ? 'text' : 'password'}
              id="authLoginPassword" 
              name="password"
              className="chatgpt-input" 
              placeholder="Enter your account password" 
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
            <button 
              type="button" 
              className="password-toggle-btn" 
              title="Toggle password visibility"
              onClick={() => setShowPassword(!showPassword)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" className="chatgpt-submit-btn" disabled={loading}>
          <span>{loading ? 'Signing in...' : 'Sign in with password'}</span>
        </button>
      </form>

      <div className="chatgpt-divider"><span>OR</span></div>

      <button type="button" className="chatgpt-secondary-btn" onClick={handleRequestOtp} disabled={loading}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>
        <span>Sign in with email OTP code</span>
      </button>
    </div>
  );
}
