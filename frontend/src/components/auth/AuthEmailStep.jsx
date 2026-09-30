import React, { useState } from 'react';
import { AUTH_API } from '../../config';

export default function AuthEmailStep({ onNext, onError }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        // data.registered indicates if the user exists
        onNext(email, data.registered);
      } else {
        onError(data.detail || 'Failed to check email');
      }
    } catch (err) {
      onError('Network error while checking email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatgpt-step-flow">
      <h1 className="chatgpt-auth-title">Welcome</h1>
      <p className="chatgpt-auth-subtitle">Enter your email to sign in or get started</p>

      <form className="chatgpt-form" onSubmit={handleSubmit} autoComplete="on">
        <div className="chatgpt-input-group">
          <label htmlFor="authEmail" className="chatgpt-label">Email address</label>
          <div className="input-focus-container">
            <input 
              type="email" 
              id="authEmail" 
              name="email"
              className="chatgpt-input" 
              placeholder="name@example.com" 
              autoComplete="username" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="chatgpt-submit-btn" disabled={loading}>
          <span>{loading ? 'Checking...' : 'Continue'}</span>
          {!loading && (
            <svg className="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          )}
        </button>
      </form>

      <div className="chatgpt-hint-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Instant role detection. Sign in with password or 6-digit email OTP.</span>
      </div>
    </div>
  );
}
