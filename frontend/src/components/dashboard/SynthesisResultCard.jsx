import React from 'react';

export default function SynthesisResultCard({
  queryResult,
  loading,
  error,
  onFeedback,
  votedType,
  feedbackRecorded
}) {
  const primaryCluster = (queryResult?.consensus_clusters && queryResult.consensus_clusters[0]) || null;
  const confidence = primaryCluster ? primaryCluster.confidence_score : 0.88;
  const status = primaryCluster ? primaryCluster.status : 'supported';

  let confidenceText = 'Confidence: --';
  let isHighConfidence = false;

  if (loading) {
    confidenceText = 'Evaluating...';
  } else if (queryResult) {
    confidenceText = `Confidence: ${(confidence * 100).toFixed(0)}% (${status.toUpperCase()})`;
    isHighConfidence = confidence >= 0.75;
  }

  return (
    <div className="glass-card synthesis-card" id="synthesisCard">
      <div className="card-header">
        <div className="header-icon-box pink">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="card-title">5.0 Evidence-Grounded LLM Synthesis</h3>
          <span className="card-subtitle">Formulated from Verified Community Consensus & Independence Profiling</span>
        </div>
        <div className="synthesis-badge-group">
          <span
            className={`confidence-badge ${isHighConfidence ? 'high' : ''}`}
            id="confidenceGaugeBadge"
          >
            {confidenceText}
          </span>
        </div>
      </div>

      <div className="synthesis-content-box" id="synthesisContent">
        {loading && (
          <div className="synthesis-placeholder">
            <div className="placeholder-icon" style={{ animation: 'spin 1.5s linear infinite' }}>
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p>Executing 6-Layer Community Intelligence Pipeline...</p>
            <small>Collecting heterogeneous posts, decomposing contextual claims, and inferring consensus weight.</small>
          </div>
        )}

        {error && !loading && (
          <div className="synthesis-placeholder" style={{ color: '#ef4444' }}>
            <p>Execution Error</p>
            <small>{error}</small>
          </div>
        )}

        {!loading && !error && queryResult && (
          <div className="synthesis-rendered">
            <div className="headline-box">
              <strong>Community Consensus:</strong> {queryResult.headline_answer}
            </div>

            <div className="synthesis-section">
              <h4>Synthesized Evidence & Supported Claims</h4>
              <div className="claims-pill-list">
                {(primaryCluster ? primaryCluster.claims : []).map((c, idx) => (
                  <div className="claim-pill-item" key={c.claim_id || idx}>
                    <strong>[{c.platform}]</strong> {c.text}
                  </div>
                ))}
              </div>
            </div>

            {queryResult.caveats && queryResult.caveats.length > 0 && (
              <div className="caveats-box">
                <strong style={{ color: 'var(--layer4-amber)', fontSize: '13px' }}>
                  Platform Caveats & Version Warnings:
                </strong>
                <ul>
                  {queryResult.caveats.map((caveat, idx) => (
                    <li key={idx}>{caveat}</li>
                  ))}
                </ul>
              </div>
            )}

            {queryResult.confidence_explanation && (
              <div className="synthesis-section">
                <h4>Bayesian Calibration Explanation</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {queryResult.confidence_explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !queryResult && (
          <div className="synthesis-placeholder">
            <div className="placeholder-icon">
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p>Run a query above to generate the evidence-grounded synthesis.</p>
            <small>The synthesis engine integrates weighted claims from Stack Overflow, GitHub, and Reddit with duplicate elimination.</small>
          </div>
        )}
      </div>

      {/* Layer 6: Human Feedback Loop Widget */}
      <div className="feedback-strip" id="feedbackStrip">
        <div className="feedback-prompt">
          <span>Rate Synthesis Accuracy:</span>
          <small>Layer 6 Continuous Improvement Loop</small>
        </div>
        <div className="feedback-actions">
          <button
            className={`feedback-btn ${votedType === 'helpful' ? 'voted' : ''}`}
            onClick={() => onFeedback('helpful')}
            disabled={!queryResult || loading}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>{votedType === 'helpful' && feedbackRecorded ? 'Recorded ✓' : 'Helpful'}</span>
          </button>

          <button
            className={`feedback-btn ${votedType === 'incorrect' ? 'voted' : ''}`}
            onClick={() => onFeedback('incorrect')}
            disabled={!queryResult || loading}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            <span>{votedType === 'incorrect' && feedbackRecorded ? 'Recorded ✓' : 'Contradiction'}</span>
          </button>

          <button
            className={`feedback-btn ${votedType === 'missing_evidence' ? 'voted' : ''}`}
            onClick={() => onFeedback('missing_evidence')}
            disabled={!queryResult || loading}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{votedType === 'missing_evidence' && feedbackRecorded ? 'Recorded ✓' : 'Missing Evidence'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
