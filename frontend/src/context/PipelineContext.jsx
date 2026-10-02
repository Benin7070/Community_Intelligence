import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { usePipelineWS } from '../hooks/usePipelineWS';
import { useAuth } from './AuthContext';
import { API_BASE, WS_PIPELINE_URL } from '../config';

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
  const { user } = useAuth();
  const wsState = usePipelineWS(WS_PIPELINE_URL);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timerText, setTimerText] = useState('Idle');
  const [votedType, setVotedType] = useState(null);
  const [feedbackRecorded, setFeedbackRecorded] = useState(false);

  // Active persistent Chat Session ID (tracks follow-up chains)
  const [activeChatId, setActiveChatId] = useState(() => `chat_${Math.random().toString(36).substring(2, 10)}`);
  
  // Chat message stream: array of { id, chatId, messageId, query, competitorModel, timestamp, loading, data, error, votedPreference, isLocked, r2_url }
  const [chatMessages, setChatMessages] = useState([]);
  
  // Historical chats for the sidebar
  const [historyList, setHistoryList] = useState([]);

  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastActiveRequestTimeRef = useRef(Date.now());

  // Stop timer helper
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Smart Render Anti-Sleep Keep-Alive
  // Keeps Render awake by pinging when idle >= 45s, but skips if any request is currently handling or recent.
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      // 1. Skip completely if any query or pipeline is actively in flight
      if (loading) return;

      const idleDurationMs = Date.now() - lastActiveRequestTimeRef.current;
      // 2. Only ping if idle for 45 seconds or more
      if (idleDurationMs >= 45000) {
        try {
          const res = await fetch(`${API_BASE}/health/ping`);
          if (res.ok) {
            // Reset idle timer upon successful anti-sleep ping
            lastActiveRequestTimeRef.current = Date.now();
          }
        } catch {
          // Ignore network glitch to avoid noisy logs
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(keepAliveInterval);
  }, [loading]);

  // Sync System completed event from WebSocket
  useEffect(() => {
    if (wsState.systemStatus === 'completed') {
      stopTimer();
      setTimerText('Completed');
    } else if (wsState.systemStatus === 'error') {
      stopTimer();
      setTimerText('Error');
    }
  }, [wsState.systemStatus, stopTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const fetchChats = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error('[Pipeline] Failed to fetch chat history:', err);
    }
  }, []);

  const loadChat = useCallback(async (chatId) => {
    setActiveChatId(chatId);
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const messages = await res.json();
        // Group user and assistant messages into a single ChatTurnItem structure
        const turns = [];
        let currentTurn = null;
        
        messages.forEach(m => {
          if (m.role === 'user') {
            if (currentTurn) turns.push(currentTurn);
            currentTurn = {
              id: m.id.replace('_u', ''),
              chatId: chatId,
              messageId: m.id.replace('_u', ''),
              query: m.preview_text,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              loading: true, // We set to loading until R2 is fetched if there's an assistant response next
              data: null,
              r2_url: null,
              votedPreference: null,
              isLocked: false
            };
          } else if (m.role === 'assistant' && currentTurn) {
            currentTurn.loading = false;
            currentTurn.r2_url = m.r2_url; // Will trigger sliding window lazy load in UI
            currentTurn.competitorModel = m.competitor_model;
            currentTurn.isLocked = m.is_locked;
            currentTurn.votedPreference = m.voted_preference;
            // The actual heavy data will be loaded lazily in the component using the r2_url
          }
        });
        if (currentTurn) turns.push(currentTurn);
        
        setChatMessages(turns);
      }
    } catch (err) {
      console.error('[Pipeline] Failed to load chat messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chat history when user logs in (or on mount if already authenticated)
  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      // Clear history on logout
      setHistoryList([]);
      setChatMessages([]);
      setActiveChatId(`chat_${Math.random().toString(36).substring(2, 10)}`);
    }
  }, [user, fetchChats]);

  const executePipeline = useCallback(async (query, competitorModel = "OpenAI (GPT-4o-mini)") => {
    if (!query || !query.trim()) return;

    const trimmedQuery = query.trim();
    const msgId = `msg_${Math.random().toString(36).substring(2, 10)}`;

    // Add optimistic user query to chat stream
    const newMessage = {
      id: msgId,
      chatId: activeChatId,
      messageId: msgId,
      query: trimmedQuery,
      competitorModel: competitorModel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      loading: true,
      data: null,
      error: null,
      votedPreference: null,
      isLocked: false
    };

    setChatMessages(prev => [...prev, newMessage]);
    setLoading(true);
    setError(null);
    lastActiveRequestTimeRef.current = Date.now();
    wsState.resetStages();

    // Start live timer
    stopTimer();
    startTimeRef.current = Date.now();
    setTimerText('0.0s');
    timerIntervalRef.current = setInterval(() => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setTimerText(`${elapsed}s`);
    }, 100);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: trimmedQuery,
          chat_id: activeChatId,
          message_id: msgId,
          competitor_model: competitorModel
        })
      });

      if (!response.ok) {
        throw new Error(`Pipeline execution failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      setCurrentData(data);

      // Update message in chat stream with dual responses
      setChatMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            loading: false,
            data: data
          };
        }
        return m;
      }));
    } catch (err) {
      console.error('[Pipeline] Execution error:', err);
      setError(err.message || 'An error occurred during pipeline execution');
      stopTimer();
      setTimerText('Error');

      setChatMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            loading: false,
            error: err.message
          };
        }
        return m;
      }));
    } finally {
      lastActiveRequestTimeRef.current = Date.now();
      setLoading(false);
      // Refresh chat history to update sidebar
      fetchChats();
    }
  }, [activeChatId, wsState, stopTimer, fetchChats]);

  // Lock and submit model preference choice
  const lockPreference = useCallback(async (messageId, preferredModel, isLocked = true) => {
    const targetMsg = chatMessages.find(m => m.id === messageId);
    if (!targetMsg) return;

    // Optimistic UI update
    setChatMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          votedPreference: preferredModel,
          isLocked: isLocked
        };
      }
      return m;
    }));

    lastActiveRequestTimeRef.current = Date.now();

    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: targetMsg.query,
          chat_id: targetMsg.chatId,
          message_id: targetMsg.messageId,
          feedback_type: 'preference',
          preferred_model: preferredModel,
          competitor_model: targetMsg.competitorModel || targetMsg.data?.competitor_model || 'OpenAI (GPT-4o-mini)',
          competitor_response: targetMsg.data?.chatgpt_response || '',
          ci_response: targetMsg.data?.headline_answer || '',
          competitor_latency_ms: targetMsg.data?.competitor_latency_ms || 0,
          ci_latency_ms: targetMsg.data?.ci_latency_ms || 0,
          is_locked: isLocked,
          comment: `User locked preference: ${preferredModel}`
        })
      });
    } catch (err) {
      console.error('[Pipeline] Lock preference submission failed:', err);
    }
  }, [chatMessages]);

  const submitFeedback = useCallback(async (feedbackType) => {
    if (!currentData) return;
    lastActiveRequestTimeRef.current = Date.now();

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: currentData.query,
          chat_id: currentData.chat_id || activeChatId,
          message_id: currentData.message_id || 'msg_0',
          feedback_type: feedbackType,
          comment: `User marked synthesis as ${feedbackType}`
        })
      });

      if (res.ok) {
        setVotedType(feedbackType);
        setFeedbackRecorded(true);
        setTimeout(() => {
          setFeedbackRecorded(false);
        }, 3000);
      }
    } catch (err) {
      console.error('[Pipeline] Feedback submission failed:', err);
    }
  }, [currentData, activeChatId]);

  const startNewChat = useCallback(() => {
    setActiveChatId(`chat_${Math.random().toString(36).substring(2, 10)}`);
    setChatMessages([]);
  }, []);

  const value = {
    ...wsState,
    currentData,
    loading,
    error,
    timerText,
    votedType,
    feedbackRecorded,
    activeChatId,
    chatMessages,
    historyList,
    executePipeline,
    submitFeedback,
    lockPreference,
    startNewChat,
    loadChat,
    fetchChats
  };

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
