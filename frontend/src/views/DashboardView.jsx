import React, { useState, useEffect, useRef } from 'react';
import { usePipeline } from '../context/PipelineContext';
import { useAuth } from '../context/AuthContext';
import ChatTurnItem from '../components/chat/ChatTurnItem';
import ChatInputBar from '../components/chat/ChatInputBar';
import { animatePanelEntrance } from '../utils/motion';

export default function DashboardView() {
  const [query, setQuery] = useState('');
  const [competitorModel, setCompetitorModel] = useState('OpenAI (GPT-4o-mini)');
  const [siteSettings, setSiteSettings] = useState(null);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { user } = useAuth();
  const {
    loading,
    chatMessages,
    activeChatId,
    executePipeline,
    lockPreference,
    startNewChat
  } = usePipeline();

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
    
    // Fetch global site settings
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/auth/settings');
        if (res.ok) {
          const data = await res.json();
          setSiteSettings(data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, loading]);

  const handleSubmit = () => {
    if (!query.trim() || loading) return;
    executePipeline(query, competitorModel);
    setQuery('');
  };

  return (
    <section
      className="view-panel active"
      id="viewDashboard"
      ref={panelRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '20px'
      }}
    >
      
      {/* Maintenance & Suspension Blocks */}
      {user?.is_suspended === 1 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px 30px', borderTop: '4px solid #ef4444' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444', marginBottom: '20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
              Account Suspended
            </h2>
            <p style={{ color: '#a1a1aa', lineHeight: '1.6', fontSize: '15px' }}>
              Your account has been temporarily suspended by an administrator. You currently do not have access to the platform services.
            </p>
          </div>
        </div>
      ) : (siteSettings?.maintenance_mode === 1 && user?.role !== 'admin') ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px 30px', borderTop: '4px solid #3b82f6' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#3b82f6', marginBottom: '20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a1 1 0 0 1-1.41-1.41l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77a1 1 0 0 0 0 1.41z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
              Thanks for your interest!
            </h2>
            <p style={{ color: '#a1a1aa', lineHeight: '1.6', fontSize: '15px' }}>
              {siteSettings?.maintenance_message || 'This platform is temporarily closed for maintenance. We are currently undergoing scheduled upgrades.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Console Title & Stats Bar */}
      <div
        className="glass-card comparative-header-card"
        style={{
          padding: '16px 22px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              A/B Model Evaluation Arena
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-tiny"></span> RLHF Preference Logging Active
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Comparative Intelligence Console
          </h2>
          <p style={{ fontSize: '12.5px', color: '#a1a1aa', margin: 0 }}>
            Submit a query to evaluate competitor LLMs side-by-side against our 6-Layer Community Intelligence Pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Chat Session ID</span>
            <code style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
              {activeChatId}
            </code>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Turns Evaluated</span>
            <strong style={{ fontSize: '15px', color: '#ffffff', fontFamily: 'JetBrains Mono' }}>
              {chatMessages.length}
            </strong>
          </div>

          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={startNewChat}
              disabled={loading}
              title="Start a new chat session with a fresh Chat ID"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream Viewport */}
      <div
        className="chat-stream-viewport"
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '350px'
        }}
      >
        {chatMessages.length === 0 ? (
          <div
            className="chat-welcome-banner glass-card"
            style={{
              padding: '40px 30px',
              borderRadius: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              background: 'rgba(18, 18, 20, 0.6)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: '#38bdf8'
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              Compare Standard LLMs with Community Intelligence
            </h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', maxWidth: '620px', lineHeight: 1.6, marginBottom: '20px' }}>
              Ask any complex developer question. Your prompt will execute simultaneously through a competitor baseline (OpenAI, Claude, or Gemini) and our 6-Layer Community Intelligence Pipeline with evidence cross-referencing. Lock your choice to register preference telemetry in the Admin Console.
            </p>
          </div>
        ) : (
          chatMessages.map(msg => (
            <ChatTurnItem
              key={msg.id}
              message={msg}
              onSelectPreference={(msgId, pref) => lockPreference(msgId, pref, false)}
              onLockPreference={(msgId, pref, isLocked) => lockPreference(msgId, pref, isLocked)}
              currentUser={user}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed/Sticky Bottom Chat Input Bar */}
      <div style={{ marginTop: '16px', flexShrink: 0 }}>
        <ChatInputBar
          query={query}
          setQuery={setQuery}
          onSubmit={handleSubmit}
          loading={loading}
          hasMessages={chatMessages.length > 0}
          competitorModel={competitorModel}
          setCompetitorModel={setCompetitorModel}
          activeChatId={activeChatId}
          onNewChat={startNewChat}
        />
      </div>
        </>
      )}
    </section>
  );
}
