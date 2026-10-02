import React, { useState } from 'react';
import { AUTH_API } from '../../config';

export default function AuthSignupStep({ email, onEditEmail, onLoginSuccess, onError }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      onError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpRequested(true);
      } else {
        onError(data.detail || 'Failed to request OTP');
      }
    } catch (err) {
      onError('Network error while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    
    setLoading(true);
    try {
      // Assuming a dedicated /register endpoint that validates both OTP and sets password
      // or we first verify OTP then register, depending on API.
      // Based on auth.js: fetch(`${AUTH_API}/register`)...
      const res = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp })
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.user);
      } else {
        onError(data.detail || 'Registration failed');
      }
    } catch (err) {
      onError('Network error while registering');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatgpt-step-flow">
      <div className="chatgpt-unregistered-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>No account found with this email</span>
      </div>

      <h1 className="chatgpt-auth-title" style={{ marginTop: '6px' }}>Create account</h1>
      <div className="chatgpt-email-indicator">
        <span>Registering <strong>{email}</strong></span>
        <button type="button" className="chatgpt-link-action" onClick={onEditEmail} title="Change email">Edit</button>
      </div>

      <form className="chatgpt-form" onSubmit={otpRequested ? handleVerifyAndRegister : handleRequestOtp} autoComplete="off">
        <div className="chatgpt-input-group">
          <label htmlFor="authSignupPassword" className="chatgpt-label">Choose password (min 6 chars)</label>
          <div className="input-focus-container">
            <input 
              type="password" 
              id="authSignupPassword" 
              className="chatgpt-input" 
              placeholder="Create a password" 
              required 
              minLength="6"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={otpRequested || loading}
              autoFocus
            />
          </div>
        </div>

        <div className="chatgpt-input-group">
          <label htmlFor="authSignupPasswordConfirm" className="chatgpt-label">Confirm password</label>
          <div className="input-focus-container">
            <input 
              type="password" 
              id="authSignupPasswordConfirm" 
              className="chatgpt-input" 
              placeholder="Repeat password" 
              required 
              minLength="6"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={otpRequested || loading}
            />
          </div>
        </div>

        {otpRequested && (
          <div style={{ marginTop: '8px' }}>
            <div className="chatgpt-input-group">
              <label htmlFor="authSignupOtp" className="chatgpt-label">Enter 6-digit email code</label>
              <div className="input-focus-container">
                <input 
                  type="text" 
                  id="authSignupOtp" 
                  className="chatgpt-input chatgpt-otp-field" 
                  placeholder="000000" 
                  maxLength="6" 
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="chatgpt-resend-row">
              <span>Didn't receive code?</span>
              <button type="button" className="chatgpt-link-action" onClick={handleRequestOtp} disabled={loading}>Resend code</button>
            </div>
          </div>
        )}

        <button type="submit" id="authSignupBtn" className="chatgpt-submit-btn" disabled={loading}>
          <span>{loading ? 'Processing...' : (otpRequested ? 'Verify & Create Account' : 'Send Verification Code')}</span>
        </button>
      </form>
    </div>
  );
}
