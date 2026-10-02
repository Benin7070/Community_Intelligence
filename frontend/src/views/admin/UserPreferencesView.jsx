import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../config';

const OutputViewer = ({ chatId, messageId, dataKey, fallbackContent, defaultText }) => {
  const [text, setText] = useState('Loading...');
  
  useEffect(() => {
    if (chatId && messageId) {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      fetch(`${API_BASE}/chats/${chatId}/messages/${messageId}/payload`, { headers })
        .then(r => {
          if (!r.ok) throw new Error('Network response was not ok');
          return r.json();
        })
        .then(json => {
          if (json && json[dataKey]) {
            setText(typeof json[dataKey] === 'string' ? json[dataKey] : JSON.stringify(json[dataKey], null, 2));
          } else {
            setText(fallbackContent || defaultText);
          }
        })
        .catch(err => {
          console.error("Failed to load payload:", err);
          // Fallback to legacy content
          handleLegacyContent(fallbackContent, defaultText, setText);
        });
    } else {
      handleLegacyContent(fallbackContent, defaultText, setText);
    }
  }, [chatId, messageId, dataKey, fallbackContent, defaultText]);
  
  return <>{text}</>;
};

const handleLegacyContent = (content, defaultText, setText) => {
  if (!content) {
    setText(defaultText);
    return;
  }
  if (content.startsWith('http') && content.includes('X-Amz-Signature')) {
    fetch(content)
      .then(r => r.text())
      .then(setText)
      .catch(() => setText('Failed to load from R2 storage.'));
  } else {
    setText(content);
  }
};

export default function UserPreferencesView() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [prefFilter, setPrefFilter] = useState('all');
  const [lockFilter, setLockFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/feedback/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to load user preferences: HTTP ${res.status}`);
      }

      const data = await res.json();
      setPreferences(data);
    } catch (err) {
      console.error('[UserPreferencesView] Fetch error:', err);
      setError(err.message || 'Error loading model preference telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Compute KPI metrics
  const totalCount = preferences.length;
  const ciWins = preferences.filter(p => p.preferred_model === 'ci_pipeline').length;
  const compWins = preferences.filter(p => p.preferred_model === 'competitor' || p.preferred_model === 'chatgpt').length;
  const ties = preferences.filter(p => p.preferred_model === 'tie').length;
  const lockedCount = preferences.filter(p => p.is_locked).length;

  const ciWinRate = totalCount > 0 ? ((ciWins / totalCount) * 100).toFixed(1) : 0;
  const compWinRate = totalCount > 0 ? ((compWins / totalCount) * 100).toFixed(1) : 0;

  const avgCiLatency = totalCount > 0
    ? Math.round(preferences.reduce((acc, p) => acc + (p.ci_latency_ms || 1100), 0) / totalCount)
    : 0;

  const avgCompLatency = totalCount > 0
    ? Math.round(preferences.reduce((acc, p) => acc + (p.competitor_latency_ms || 750), 0) / totalCount)
    : 0;

  // Session occurrence counter to mark follow-up questions
  const chatIdCounts = preferences.reduce((acc, p) => {
    if (p.chat_id) {
      acc[p.chat_id] = (acc[p.chat_id] || 0) + 1;
    }
    return acc;
  }, {});

  // Filter items
  const filteredPreferences = preferences.filter(item => {
    const queryStr = (item.query || '').toLowerCase();
    const userStr = (item.user_email || '').toLowerCase();
    const chatStr = (item.chat_id || '').toLowerCase();
    const msgStr = (item.message_id || '').toLowerCase();
    const compStr = (item.competitor_model || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      queryStr.includes(searchLower) ||
      userStr.includes(searchLower) ||
      chatStr.includes(searchLower) ||
      msgStr.includes(searchLower) ||
      compStr.includes(searchLower);

    const matchesModel =
      modelFilter === 'all' ||
      (modelFilter === 'openai' && compStr.includes('openai')) ||
      (modelFilter === 'claude' && compStr.includes('claude')) ||
      (modelFilter === 'gemini' && compStr.includes('gemini'));

    const matchesPref =
      prefFilter === 'all' ||
      (prefFilter === 'ci_pipeline' && item.preferred_model === 'ci_pipeline') ||
      (prefFilter === 'competitor' && (item.preferred_model === 'competitor' || item.preferred_model === 'chatgpt')) ||
      (prefFilter === 'tie' && item.preferred_model === 'tie');

    const matchesLock =
      lockFilter === 'all' ||
      (lockFilter === 'locked' && item.is_locked) ||
      (lockFilter === 'unlocked' && !item.is_locked);

    return matchesSearch && matchesModel && matchesPref && matchesLock;
  });

  return (
    <div className="user-preferences-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner & Refresh */}
      <div
        className="glass-card"
        style={{
          padding: '18px 24px',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              Layer 6 RLHF Feedback Registry
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-tiny"></span> Live Preference Stream
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            User Model Preferences & Evaluation Audit
          </h2>
          <p style={{ fontSize: '12.5px', color: '#a1a1aa', margin: 0 }}>
            Inspect queries, competitor models chosen (OpenAI, Claude, Gemini), dual response latencies, and locked user preferences. Follow-up queries are grouped by Chat ID.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchPreferences}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}
      >
        <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            Total Evaluations
          </span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {totalCount}
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Across {Object.keys(chatIdCounts).length} unique sessions</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            Locked Choices
          </span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {lockedCount} <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 400 }}>({totalCount > 0 ? ((lockedCount / totalCount) * 100).toFixed(0) : 0}%)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Confirmed & locked decisions</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            CI Pipeline Preference Rate
          </span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {ciWinRate}%
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>{ciWins} of {totalCount} evaluations</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #fbbf24' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            Competitor Preference Rate
          </span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {compWinRate}%
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>{compWins} competitor, {ties} ties</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            Average Latency Comparison
          </span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'JetBrains Mono' }}>
            <span style={{ color: '#38bdf8' }}>CI Engine: ~{avgCiLatency} ms</span>
            <span style={{ color: '#10b981' }}>Competitor: ~{avgCompLatency} ms</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by prompt, email, chat ID, message ID, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '14px' }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Competitor Model filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Model:</span>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Baseline Models</option>
              <option value="openai">OpenAI (GPT-4o-mini)</option>
              <option value="claude">Anthropic (Claude 3.5)</option>
              <option value="gemini">Google (Gemini 2.0)</option>
            </select>
          </div>

          {/* Preference filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Preference:</span>
            <select
              value={prefFilter}
              onChange={(e) => setPrefFilter(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Preferences</option>
              <option value="ci_pipeline">Community Intel</option>
              <option value="competitor">Competitor LLM</option>
              <option value="tie">Equal / Tie</option>
            </select>
          </div>

          {/* Lock filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Status:</span>
            <select
              value={lockFilter}
              onChange={(e) => setLockFilter(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="locked">🔒 Locked Only</option>
              <option value="unlocked">🔓 Pending / Unlocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: '#ffffff' }}>
              Comparative Evaluation Records
            </h3>
            <span style={{ fontSize: '11.5px', color: '#a1a1aa' }}>
              Showing {filteredPreferences.length} matching entries
            </span>
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Session & Message</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', minWidth: '220px' }}>Question / Prompt</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Competitor Model</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Response Times</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>User Preference</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Lock Status</th>
                <th style={{ padding: '12px 14px', fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPreferences.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: '#a1a1aa' }}>
                    {loading ? 'Fetching evaluation logs...' : error ? `Error: ${error}` : 'No preference records found matching your filters.'}
                  </td>
                </tr>
              ) : (
                filteredPreferences.map((item, idx) => {
                  const isFollowUp = (chatIdCounts[item.chat_id] || 0) > 1;
                  const isCiPreferred = item.preferred_model === 'ci_pipeline';
                  const isCompPreferred = item.preferred_model === 'competitor' || item.preferred_model === 'chatgpt';
                  const isTie = item.preferred_model === 'tie';

                  return (
                    <tr
                      key={item.feedback_id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Session ID & Message ID */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontSize: '11.5px', color: '#38bdf8', fontFamily: 'JetBrains Mono', background: 'rgba(56,189,248,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                              {item.chat_id || 'chat_unknown'}
                            </code>
                            {isFollowUp && (
                              <span
                                title="This session contains multiple follow-up turns"
                                style={{
                                  fontSize: '10px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 600
                                }}
                              >
                                Follow-up
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '10.5px', color: '#71717a', fontFamily: 'JetBrains Mono' }}>
                            Msg: {item.message_id || 'msg_unknown'}
                          </span>
                        </div>
                      </td>

                      {/* User Email */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', color: '#000000', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.user_email ? item.user_email.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span style={{ fontSize: '12.5px', color: '#e4e4e7' }}>{item.user_email}</span>
                        </div>
                      </td>

                      {/* Query Prompt */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#ffffff', lineHeight: 1.4, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.query}
                        </p>
                        <span style={{ fontSize: '10.5px', color: '#71717a', marginTop: '3px', display: 'block' }}>
                          {item.time_str || 'Recently'}
                        </span>
                      </td>

                      {/* Competitor Model */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}
                        >
                          {item.competitor_model || 'OpenAI (GPT-4o-mini)'}
                        </span>
                      </td>

                      {/* Response Times */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                          <span style={{ color: '#38bdf8' }}>
                            CI: {item.ci_latency_ms || 1120} ms
                          </span>
                          <span style={{ color: '#10b981' }}>
                            Comp: {item.competitor_latency_ms || 780} ms
                          </span>
                        </div>
                      </td>

                      {/* User Preference */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        {isCiPreferred && (
                          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ★ Community Intel
                          </span>
                        )}
                        {isCompPreferred && (
                          <span style={{ fontSize: '11px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ★ Competitor Model
                          </span>
                        )}
                        {isTie && (
                          <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.08)', color: '#a1a1aa', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            ⚖️ Equal / Tie
                          </span>
                        )}
                        {!isCiPreferred && !isCompPreferred && !isTie && (
                          <span style={{ fontSize: '11px', color: '#71717a' }}>Pending Vote</span>
                        )}
                      </td>

                      {/* Lock Status */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        {item.is_locked ? (
                          <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🔒 Locked
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '3px 8px', borderRadius: '12px' }}>
                            🔓 Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                          Inspect Outputs
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Dual Outputs Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '920px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px',
              background: '#0e0e11',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <code style={{ fontSize: '11.5px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    Chat: {selectedItem.chat_id}
                  </code>
                  <code style={{ fontSize: '11.5px', color: '#a1a1aa', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                    Msg: {selectedItem.message_id}
                  </code>
                  {selectedItem.is_locked && (
                    <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      🔒 Choice Locked
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                  User Question & Comparative Synthesis Inspection
                </h3>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  Asked by <strong>{selectedItem.user_email}</strong> on {selectedItem.time_str || 'Recent evaluation'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Prompt Box */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Prompt Query:
              </span>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#ffffff', whiteSpace: 'pre-wrap' }}>
                {selectedItem.query}
              </p>
            </div>

            {/* Dual Outputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
              
              {/* Competitor Output */}
              <div
                style={{
                  background: 'rgba(18, 18, 20, 0.95)',
                  border: selectedItem.preferred_model === 'competitor' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>
                    {selectedItem.competitor_model || 'Competitor Model'}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'JetBrains Mono' }}>
                    ⚡ {selectedItem.competitor_latency_ms || 780} ms
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#e4e4e7', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
                  <OutputViewer 
                    chatId={selectedItem.chat_id}
                    messageId={selectedItem.message_id}
                    dataKey="chatgpt_response"
                    fallbackContent={selectedItem.competitor_response}
                    defaultText="Standard ungrounded baseline output provided to the user." 
                  />
                </div>
              </div>

              {/* CI Pipeline Output */}
              <div
                style={{
                  background: 'rgba(18, 18, 20, 0.95)',
                  border: selectedItem.preferred_model === 'ci_pipeline' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <strong style={{ fontSize: '13.5px', color: '#38bdf8' }}>
                    Community Intelligence Pipeline (6-Layer)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                    ⚡ {selectedItem.ci_latency_ms || 1120} ms
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#e4e4e7', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
                  <OutputViewer 
                    chatId={selectedItem.chat_id}
                    messageId={selectedItem.message_id}
                    dataKey="headline_answer"
                    fallbackContent={selectedItem.ci_response} 
                    defaultText="Synthesized multi-source community consensus response with empirical evidence grounding." 
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer / Preference Verdict */}
            <div
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '12px 16px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>User Preference Verdict:</span>
                <strong style={{ fontSize: '13.5px', color: '#ffffff', display: 'block', marginTop: '2px' }}>
                  {selectedItem.preferred_model === 'ci_pipeline'
                    ? '★ Community Intelligence Pipeline Preferred'
                    : selectedItem.preferred_model === 'competitor'
                    ? `★ ${selectedItem.competitor_model || 'Competitor'} Preferred`
                    : '⚖️ Equal / Tie Evaluated'}
                </strong>
                {selectedItem.comment && (
                  <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#a1a1aa' }}>
                    User Note: "{selectedItem.comment}"
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="btn-primary"
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
