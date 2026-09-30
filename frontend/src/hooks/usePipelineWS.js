import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_PIPELINE_URL } from '../config';

const INITIAL_STAGES = [
  { id: 'm1', code: '3.1', name: '3.1 Community Data Acquisition', desc: 'Ingest from Stack Overflow, GitHub, Reddit, & Forums', status: 'standby', details: null },
  { id: 'm2', code: '3.2', name: '3.2 Claim & Context Modeling', desc: 'Decompose posts into contextual claims (version/env)', status: 'standby', details: null },
  { id: 'm3', code: '3.3', name: '3.3 Evidence Assessment', desc: 'Classify relationships (supports, contradicts, qualifies)', status: 'standby', details: null },
  { id: 'm4', code: '3.4', name: '3.4 Provenance & Independence', desc: 'MinHash/SimHash duplicate & derived content penalty', status: 'standby', details: null },
  { id: 'm5', code: '3.5', name: '3.5 Reliability & Community Signals', desc: 'Compute Eq 1 Multi-signal credibility weight S_cred', status: 'standby', details: null },
  { id: 'm6', code: '3.6', name: '3.6 Collective Support & Conflict', desc: 'Truth-discovery consensus clustering & conflict matrix', status: 'standby', details: null },
  { id: 'm7', code: '3.7', name: '3.7 Uncertainty & Abstention', desc: 'Bayesian sigmoidal calibration & abstention safety guard', status: 'standby', details: null }
];

export function usePipelineWS(wsUrl = WS_PIPELINE_URL) {
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, reconnecting, disconnected
  const [stages, setStages] = useState(INITIAL_STAGES);
  const [routerState, setRouterState] = useState({
    status: 'ready', // ready, analyzing, completed
    statusText: 'Ready',
    details: null
  });
  const [systemStatus, setSystemStatus] = useState('idle'); // idle, running, completed, error
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const resetStages = useCallback(() => {
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'standby', details: null })));
    setRouterState({
      status: 'ready',
      statusText: 'Ready',
      details: null
    });
    setSystemStatus('idle');
  }, []);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      const { module, status, details } = data;

      if (!module) return;

      // Layer 2: Query Routing
      if (module.includes('2.0 Query Understanding')) {
        if (status === 'started') {
          setRouterState({
            status: 'analyzing',
            statusText: 'Analyzing...',
            details: null
          });
        } else if (status === 'completed' && details) {
          setRouterState({
            status: 'completed',
            statusText: 'Routed: CI Pipeline',
            details: details
          });
        }
        return;
      }

      // Layer 3: Core Pipeline Stages (3.1 to 3.7)
      setStages(prevStages => {
        return prevStages.map(stage => {
          if (module.startsWith(stage.code)) {
            return {
              ...stage,
              status: status === 'started' ? 'active' : status === 'completed' ? 'completed' : stage.status,
              details: details || stage.details
            };
          }
          return stage;
        });
      });

      // System Completion or Error
      if (module === 'System') {
        if (status === 'completed') {
          setSystemStatus('completed');
        } else if (status === 'error') {
          setSystemStatus('error');
        }
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('connected');
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('reconnecting');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2500);
      };

      wsRef.current.onerror = (err) => {
        console.warn('[WS] Socket error, waiting for reconnect', err);
      };
    } catch (e) {
      console.error('[WS] Failed to create socket connection', e);
      setConnectionStatus('disconnected');
    }
  }, [wsUrl, handleMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connectionStatus,
    stages,
    routerState,
    systemStatus,
    setRouterState,
    resetStages
  };
}
