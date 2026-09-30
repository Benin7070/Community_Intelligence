import React, { useState } from 'react';
import AuthEmailStep from './auth/AuthEmailStep';
import AuthPasswordStep from './auth/AuthPasswordStep';
import AuthOtpStep from './auth/AuthOtpStep';
import AuthSignupStep from './auth/AuthSignupStep';

export default function AuthOverlay({ onLogin }) {
  const [step, setStep] = useState('email'); // 'email', 'password', 'otp', 'signup'
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const handleEmailNext = (submittedEmail, isRegistered) => {
    setEmail(submittedEmail);
    setError(null);
    if (isRegistered) {
      setStep('password');
    } else {
      setStep('signup');
    }
  };

  const handleEditEmail = () => {
    setStep('email');
    setError(null);
  };

  return (
    <div className="auth-overlay active">
      <div className="chatgpt-auth-container">
        
        <div className="chatgpt-brand-box">
          <div className="brand-glyph" style={{ width: '40px', height: '40px' }}>
            <span className="glyph-core">CI</span>
            <div className="glyph-glow"></div>
          </div>
        </div>

        {error && (
          <div className="auth-alert-box" style={{ display: 'flex', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: '13px' }}>{error}</span>
          </div>
        )}

        {step === 'email' && (
          <AuthEmailStep 
            onNext={handleEmailNext} 
            onError={setError} 
          />
        )}
        
        {step === 'password' && (
          <AuthPasswordStep 
            email={email} 
            onEditEmail={handleEditEmail} 
            onLoginSuccess={onLogin} 
            onSwitchToOtp={() => { setStep('otp'); setError(null); }} 
            onError={setError} 
          />
        )}
        
        {step === 'otp' && (
          <AuthOtpStep 
            email={email} 
            onEditEmail={handleEditEmail} 
            onLoginSuccess={onLogin} 
            onSwitchToPassword={() => { setStep('password'); setError(null); }} 
            onError={setError} 
          />
        )}
        
        {step === 'signup' && (
          <AuthSignupStep 
            email={email} 
            onEditEmail={handleEditEmail} 
            onLoginSuccess={onLogin} 
            onError={setError} 
          />
        )}
        
        <div className="chatgpt-trust-footer">
          <span>Protected by reCAPTCHA</span>
          <span>•</span>
          <a href="#">Privacy</a>
          <span>•</span>
          <a href="#">Terms</a>
        </div>

      </div>
    </div>
  );
}
