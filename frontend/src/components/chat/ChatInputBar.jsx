import React, { useRef, useEffect } from 'react';
import { startButtonPulse, stopButtonPulse } from '../../utils/motion';

const SUGGESTIONS = [
  'React useEffect infinite re-render loop with object dependencies',
  'PyTorch CUDA out of memory in DataLoader multiprocessing workers',
  'Python AsyncIO vs ThreadPoolExecutor latency under high concurrency'
];

export default function ChatInputBar({
  query,
  setQuery,
  onSubmit,
  loading,
  hasMessages = false,
  competitorModel = 'OpenAI (GPT-4o-mini)',
  setCompetitorModel,
  activeChatId,
  onNewChat
}) {
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
      if (query.trim() && !loading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="chat-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      
      {/* Suggestions chips shown before any queries */}
      {!hasMessages && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '4px' }}>
          {SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => {
                setQuery(suggestion);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e4e4e7',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Session tracker header when messages exist */}
      {hasMessages && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '11.5px', color: '#a1a1aa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Active Session:</span>
            <code style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)', fontFamily: 'JetBrains Mono' }}>
              {activeChatId || 'chat_session'}
            </code>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-tiny"></span> Follow-ups linked
            </span>
          </div>
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e4e4e7',
                padding: '3px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Chat Session
            </button>
          )}
        </div>
      )}

      {/* Main Chat Input Form Box */}
      <div
        className="glass-card chat-input-card"
        style={{
          background: 'rgba(18, 18, 20, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <textarea
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask any technical software engineering question (e.g. Next.js 15 caching, CUDA memory, async deadlocks)..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '14.5px',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600 }}>
              Compare Against:
            </span>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#38bdf8',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {competitorModel === 'gpt-4o' ? 'OpenAI (GPT-4o)' 
               : competitorModel === 'claude-3.5-sonnet' ? 'Anthropic (Claude 3.5 Sonnet)' 
               : competitorModel === 'gemini-1.5-pro' ? 'Google (Gemini 1.5 Pro)'
               : competitorModel}
            </div>
          </div>

          <button
            ref={btnRef}
            type="button"
            onClick={onSubmit}
            disabled={loading || !query.trim()}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: loading ? '#71717a' : '#ffffff',
              color: '#000000',
              fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !query.trim() ? 0.6 : 1
            }}
          >
            <span>{loading ? 'Synthesizing Dual Models...' : 'Compare Responses'}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#71717a' }}>
        Press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px' }}>Enter</kbd> to submit, <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px' }}>Shift + Enter</kbd> for new line.
      </div>
    </div>
  );
}
