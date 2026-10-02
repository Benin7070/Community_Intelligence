import React, { useState } from 'react';
import { AUTH_API } from '../../config';

export default function AuthOtpStep({ email, onEditEmail, onLoginSuccess, onSwitchToPassword, onError }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.user);
      } else {
        onError(data.detail || 'Invalid verification code');
      }
    } catch (err) {
      onError('Network error while verifying code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      const res = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setCountdown(30);
      } else {
        const data = await res.json();
        onError(data.detail || 'Failed to resend code');
      }
    } catch (err) {
      onError('Network error while resending code');
    }
  };

  return (
    <div className="chatgpt-step-flow">
      <h1 className="chatgpt-auth-title">Enter your code</h1>
      <div className="chatgpt-email-indicator">
        <span>Code sent to <strong>{email}</strong></span>
        <button type="button" className="chatgpt-link-action" onClick={onEditEmail} title="Change email">Edit</button>
      </div>

      <form className="chatgpt-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="chatgpt-input-group">
          <label htmlFor="authOtp" className="chatgpt-label">6-digit verification code</label>
          <div className="input-focus-container">
            <input 
              type="text" 
              id="authOtp" 
              name="one-time-code"
              className="chatgpt-input chatgpt-otp-field" 
              placeholder="000000" 
              maxLength="6" 
              inputMode="numeric" 
              autoComplete="one-time-code" 
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={loading}
              required 
              autoFocus
            />
          </div>
        </div>

        <button type="submit" className="chatgpt-submit-btn" disabled={loading}>
          <span>{loading ? 'Verifying...' : 'Verify and continue'}</span>
        </button>

        <div className="chatgpt-resend-row">
          <span>{countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code?"}</span>
          <button 
            type="button" 
            className={`chatgpt-link-action ${countdown > 0 ? 'disabled' : ''}`} 
            onClick={handleResend} 
            disabled={countdown > 0 || loading}
          >
            Resend code
          </button>
        </div>

        <button 
          type="button" 
          className="chatgpt-link-action" 
          onClick={onSwitchToPassword}
          style={{ marginTop: '14px', textAlign: 'center', width: '100%' }}
        >
          ← Back to password sign-in
        </button>
      </form>
    </div>
  );
}
