import React from 'react';

export default function RouterInspectionCard({ routerState }) {
  const { status, statusText, details } = routerState;

  const isAnalyzing = status === 'analyzing';
  const isCompleted = status === 'completed' && details;

  return (
    <div className="glass-card router-card" id="routerInspectionCard">
      <div className="card-header">
        <div className="header-icon-box purple">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h3 className="card-title">2.0 Query Understanding & Routing</h3>
          <span className="card-subtitle">Semantic Intent & Pipeline Classification</span>
        </div>
        <span
          className={`status-pill ${status === 'ready' ? 'status-ready' : 'status-active'}`}
          id="routerStatusPill"
        >
          {statusText}
        </span>
      </div>

      <div className="router-details-body" id="routerDetailsBody">
        {isAnalyzing && (
          <div className="empty-state-text">
            Classifying semantic intent, detecting entity contexts, and evaluating CI necessity...
          </div>
        )}

        {isCompleted && (
          <div className="router-grid-tags">
            <div className="router-tag-box">
              <small>Intent</small>
              <strong>{details.intent || 'empirical_analysis'}</strong>
            </div>
            <div className="router-tag-box">
              <small>Domain</small>
              <strong>{details.domain || 'Software Runtimes'}</strong>
            </div>
            <div className="router-tag-box">
              <small>Entities</small>
              <strong>{(details.entities || []).join(', ') || 'Standard'}</strong>
            </div>
            <div className="router-tag-box">
              <small>Confidence</small>
              <strong style={{ color: 'var(--layer3-emerald)' }}>{details.confidence || '96%'}</strong>
            </div>
          </div>
        )}

        {!isAnalyzing && !isCompleted && (
          <div className="empty-state-text">
            Submit a query to inspect semantic routing & intent categorization.
          </div>
        )}
      </div>
    </div>
  );
}
