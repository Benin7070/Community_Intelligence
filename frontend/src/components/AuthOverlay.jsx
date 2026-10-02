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
        
        {/* Header Brand Icon */}
        <div className="chatgpt-brand-header">
          <div className="chatgpt-brand-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          </div>
          <span className="chatgpt-brand-name">Community Intel</span>
        </div>

        {/* Auth Glass Card */}
        <div className="chatgpt-auth-card">
          {error && (
            <div className="chatgpt-alert-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
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

          {/* Footer Trust Markers */}
          <div className="chatgpt-auth-card-footer">
            <div className="auth-security-pill">
              <span className="green-dot"></span>
              <span>Supabase Postgres &amp; IEEE Cryptographic Session</span>
            </div>
            <div className="chatgpt-legal-links">
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of use</a>
              <span className="dot-divider">•</span>
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy policy</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
