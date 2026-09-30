import React from 'react';

export default function ChatTurnItem({ message, onSelectPreference, onLockPreference, currentUser }) {
  const { id, chatId, messageId, query, competitorModel, timestamp, loading, data, error, votedPreference, isLocked } = message;

  const primaryCluster = (data?.consensus_clusters && data.consensus_clusters[0]) || null;
  const confidence = primaryCluster ? primaryCluster.confidence_score : 0.88;
  const status = primaryCluster ? primaryCluster.status : 'supported';
  const confidencePercent = (confidence * 100).toFixed(0);

  const compModel = data?.competitor_model || competitorModel || 'OpenAI (GPT-4o-mini)';
  const compLatency = data?.competitor_latency_ms || 780;
  const ciLatency = data?.ci_latency_ms || 1120;

  const isCiVoted = votedPreference === 'ci_pipeline';
  const isCompetitorVoted = votedPreference === 'competitor' || votedPreference === 'chatgpt';
  const isTieVoted = votedPreference === 'tie';

  const handleVote = (choice) => {
    if (isLocked) return;
    if (onSelectPreference) {
      onSelectPreference(id, choice);
    }
  };

  const handleLock = () => {
    if (onLockPreference) {
      const currentChoice = votedPreference || 'ci_pipeline';
      onLockPreference(id, currentChoice, true);
    }
  };

  return (
    <div className="chat-turn-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
      
      {/* 1. User Message Bubble */}
      <div className="user-message-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'flex-start' }}>
        <div
          className="user-bubble glass-card"
          style={{
            maxWidth: '75%',
            background: 'rgba(255, 255, 255, 0.09)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px 16px 4px 16px',
            padding: '14px 18px',
            color: '#ffffff',
            fontSize: '14.5px',
            lineHeight: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                You
              </span>
              {chatId && (
                <span style={{ fontSize: '10px', color: '#71717a', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                  {chatId.slice(0, 10)} : {messageId ? messageId.slice(0, 8) : id.slice(0, 8)}
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>{timestamp}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{query}</p>
        </div>

        <div
          className="user-avatar-circle"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            flexShrink: 0
          }}
        >
          {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div
          className="glass-card dual-loading-box"
          style={{
            padding: '30px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            background: 'rgba(18, 18, 20, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="placeholder-icon" style={{ animation: 'spin 1.5s linear infinite', color: '#38bdf8' }}>
            <svg width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ fontSize: '14.5px', color: '#ffffff', display: 'block', marginBottom: '4px' }}>
              Executing Dual-Pipeline Synthesis...
            </strong>
            <span style={{ fontSize: '12.5px', color: '#a1a1aa' }}>
              Querying {compModel} in parallel with 6-Layer Community Evidence grounding.
            </span>
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {error && !loading && (
        <div
          className="chatgpt-alert-box"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#ef4444'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Synthesis Error:</strong> {error}
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Comparative Responses */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div
            className="comparison-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Model A: Competitor LLM Baseline */}
            <div
              className={`glass-card response-card ${isCompetitorVoted ? 'voted-best' : ''}`}
              style={{
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: isCompetitorVoted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(18, 18, 20, 0.85)',
                border: isCompetitorVoted ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                position: 'relative',
                transition: 'all 0.25s ease'
              }}
            >
              {isCompetitorVoted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '20px',
                    background: '#10b981',
                    color: '#000000',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    letterSpacing: '0.5px'
                  }}
                >
                  ✓ {isLocked ? '🔒 LOCKED PREFERRED' : 'VOTED BETTER RESPONSE'}
                </div>
              )}

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{compModel}</h4>
                    <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Standard LLM Baseline</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className="latency-chip"
                    style={{
                      fontSize: '11px',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'JetBrains Mono',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>⚡</span> {compLatency} ms
                  </span>
                  <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}>
                    Baseline
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div style={{ fontSize: '13.5px', color: '#e4e4e7', lineHeight: 1.6, whiteSpace: 'pre-wrap', flex: 1 }}>
                {data.chatgpt_response || 'Standard ungrounded LLM response generated for technical query.'}
              </div>

              {/* Subtle footer */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#71717a' }}>
                • General training weights without empirical developer forum caveats or cross-platform consensus.
              </div>
            </div>

            {/* Model B: Community Intelligence Engine */}
            <div
              className={`glass-card response-card ${isCiVoted ? 'voted-best' : ''}`}
              style={{
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: isCiVoted ? 'rgba(56, 189, 248, 0.05)' : 'rgba(18, 18, 20, 0.85)',
                border: isCiVoted ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.16)',
                position: 'relative',
                transition: 'all 0.25s ease'
              }}
            >
              {isCiVoted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '20px',
                    background: '#38bdf8',
                    color: '#000000',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    letterSpacing: '0.5px'
                  }}
                >
                  ✓ {isLocked ? '🔒 LOCKED PREFERRED' : 'VOTED BETTER RESPONSE'}
                </div>
              )}

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Community Intelligence Pipeline</h4>
                    <span style={{ fontSize: '11px', color: '#38bdf8' }}>6-Layer Evidence Grounded</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className="latency-chip"
                    style={{
                      fontSize: '11px',
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'JetBrains Mono',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>⚡</span> {ciLatency} ms
                  </span>
                  <span className="confidence-badge high" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {confidencePercent}% ({status.toUpperCase()})
                  </span>
                </div>
              </div>

              {/* Headline Consensus Quote */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderLeft: '3px solid #38bdf8',
                  padding: '12px 14px',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}
              >
                <strong>Community Consensus:</strong> {data.headline_answer}
              </div>

              {/* Supported Claims List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, letterSpacing: '0.5px' }}>
                  Synthesized Evidence & Supported Claims:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(primaryCluster ? primaryCluster.claims : []).slice(0, 3).map((c, idx) => (
                    <div
                      key={c.claim_id || idx}
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        lineHeight: 1.4
                      }}
                    >
                      <strong style={{ color: '#38bdf8' }}>[{c.platform}]</strong> {c.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Caveats */}
              {data.caveats && data.caveats.length > 0 && (
                <div
                  style={{
                    background: 'rgba(251, 191, 36, 0.06)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}
                >
                  <strong style={{ color: '#fbbf24', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Platform Caveats & Version Warnings:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {data.caveats.slice(0, 2).map((cav, idx) => (
                      <li key={idx}>{cav}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bayesian Calibration */}
              {data.confidence_explanation && (
                <p style={{ margin: 0, fontSize: '11.5px', color: '#71717a', lineHeight: 1.4 }}>
                  {data.confidence_explanation}
                </p>
              )}
            </div>

          </div>

          {/* 5. Preference Selection Bar & Option to Lock Choice */}
          <div
            className="preference-bar glass-card"
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.45)',
              border: isLocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  Which response do you prefer?
                </span>
                {isLocked ? (
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    🔒 Choice Locked
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '2px 8px', borderRadius: '12px' }}>
                    🔓 Choice Unlocked
                  </span>
                )}
              </div>
              <small style={{ fontSize: '11.5px', color: '#a1a1aa' }}>
                {isLocked
                  ? `Your choice is locked and synchronized to Admin Model Telemetry (Chat: ${chatId || id.slice(0,8)}).`
                  : 'Select your preferred answer and lock the choice to submit to Admin RLHF telemetry.'}
              </small>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleVote('competitor')}
                disabled={isLocked}
                className={`feedback-btn ${isCompetitorVoted ? 'voted' : ''}`}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked && !isCompetitorVoted ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isCompetitorVoted ? '#10b981' : 'rgba(255,255,255,0.06)',
                  color: isCompetitorVoted ? '#000000' : '#ffffff',
                  border: isCompetitorVoted ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.16)',
                  fontWeight: 600
                }}
              >
                <span>👈 Prefer {compModel.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => handleVote('ci_pipeline')}
                disabled={isLocked}
                className={`feedback-btn ${isCiVoted ? 'voted' : ''}`}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked && !isCiVoted ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isCiVoted ? '#38bdf8' : 'rgba(56, 189, 248, 0.12)',
                  color: isCiVoted ? '#000000' : '#38bdf8',
                  border: isCiVoted ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 600
                }}
              >
                <span>👉 Prefer Community Intel</span>
              </button>

              <button
                type="button"
                onClick={() => handleVote('tie')}
                disabled={isLocked}
                className={`feedback-btn ${isTieVoted ? 'voted' : ''}`}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked && !isTieVoted ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isTieVoted ? '#ffffff' : 'rgba(255,255,255,0.06)',
                  color: isTieVoted ? '#000000' : '#a1a1aa',
                  border: isTieVoted ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <span>⚖️ Equal / Tie</span>
              </button>

              {/* Option to Lock the Choice */}
              {!isLocked ? (
                <button
                  type="button"
                  onClick={handleLock}
                  title="Lock this preference selection to record in Admin Audit Evaluation"
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Lock Choice</span>
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '4px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Choice Locked
                </span>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}