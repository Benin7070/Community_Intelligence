import React, { useRef, useEffect } from 'react';
import { startButtonPulse, stopButtonPulse } from '../../utils/motion';

export default function QueryInputCard({ query, setQuery, onSubmit, loading }) {
  const btnRef = useRef(null);
  const pulseTweenRef = useRef(null);

  useEffect(() => {
    if (loading && btnRef.current) {
      pulseTweenRef.current = startButtonPulse(btnRef.current);
    } else {
      stopButtonPulse(btnRef.current, pulseTweenRef.current);
      pulseTweenRef.current = null;
    }
    return () => {
      if (pulseTweenRef.current) {
        stopButtonPulse(btnRef.current, pulseTweenRef.current);
      }
    };
  }, [loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="glass-card query-card">
      <div className="card-header">
        <div className="header-icon-box cyan">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div>
          <h3 className="card-title">Developer Query Input</h3>
          <span className="card-subtitle">Layer 1 User Interface</span>
        </div>
      </div>
      <div className="query-form">
        <div className="input-wrapper">
          <textarea
            id="queryTextarea"
            rows="2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask a complex technical question (e.g. React hook infinite loops, PyTorch CUDA memory, AsyncIO best practices)..."
          />
        </div>
        <div className="query-actions">
          <div className="pipeline-indicators">
            <span className="badge-tag layer2-tag">Layer 2 Router: Active</span>
            <span className="badge-tag layer3-tag">CI Core: 7 Modules</span>
          </div>
          <button
            ref={btnRef}
            id="submitQueryBtn"
            className="btn-primary"
            onClick={onSubmit}
            disabled={loading || !query.trim()}
            style={{ opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            aria-label="Synthesize Query"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{loading ? 'Executing...' : 'Execute Pipeline'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
