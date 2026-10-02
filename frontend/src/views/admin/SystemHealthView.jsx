import React, { useState, useEffect, useRef, useCallback } from 'react';
import { animatePanelEntrance } from '../../utils/motion';
import { API_BASE } from '../../config';

const DEFAULT_SERVICES = [
  {
    id: 'supabase_db',
    name: 'Supabase PostgreSQL Database',
    type: 'database',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { host: '...', port: '...', engine: '...', pool_status: '...' }
  },
  {
    id: 'smtp2go',
    name: 'SMTP2GO Email Gateway',
    type: 'email',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { host: '...', port: '...', auth_type: '...', from_email: '...' }
  },
  {
    id: 'websocket_core',
    name: 'WebSocket Telemetry Gateway',
    type: 'websocket',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { endpoint: '...', active_clients: 0, orchestrator_modules: '...' }
  },
  {
    id: 'cloudflare_r2',
    name: 'Cloudflare R2 Storage',
    type: 'storage',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { endpoint: '...', bucket: '...', access_key: '...' }
  },
  {
    id: 'data_sources',
    name: 'Data Sources (SO, GitHub, HN)',
    type: 'sources',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { stackoverflow: '...', github: '...', hackernews: '...' }
  },
  {
    id: 'llm_api',
    name: 'LLM API Providers',
    type: 'ai',
    status: 'idle',
    healthy: false,
    latency_ms: 0,
    message: 'Ready for diagnostic test...',
    details: { configured_keys: '...', default: '...' }
  }
];

export default function SystemHealthView() {
  const panelRef = useRef(null);

  const [healthData, setHealthData] = useState(() => {
    try {
      const saved = localStorage.getItem('ci_admin_health_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge DEFAULT_SERVICES with saved state to ensure new services are displayed
        const mergedServices = DEFAULT_SERVICES.map(defaultSvc => {
          const savedSvc = parsed.services?.find(s => s.id === defaultSvc.id);
          return savedSvc ? savedSvc : defaultSvc;
        });
        return { ...parsed, services: mergedServices };
      }
    } catch (e) {
      console.warn("Failed to parse saved health data");
    }
    return { services: DEFAULT_SERVICES, overall_status: 'idle' };
  });

  const [loadingServices, setLoadingServices] = useState({});
  const [error, setError] = useState(null);
  
  // Initialize lastChecked and history from localStorage
  const [lastChecked, setLastChecked] = useState(() => {
    const saved = localStorage.getItem('ci_admin_health_last_checked');
    return saved ? new Date(saved) : null;
  });
  
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ci_admin_health_history');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  
  // 10-minute auto-check countdown timer
  const [timeUntilNextCheck, setTimeUntilNextCheck] = useState(600);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNextCheck(prev => {
        if (prev <= 1) {
          // Trigger silent background refresh when timer hits 0
          // Wait, the backend has an independent worker doing the actual emailing,
          // but we can also auto-refresh the UI data here when the timer fires!
          runHealthCheck();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const runHealthCheck = useCallback(async (serviceId = null) => {
    if (serviceId) {
      setLoadingServices(prev => ({ ...prev, [serviceId]: true }));
    } else {
      const allLoading = {};
      DEFAULT_SERVICES.forEach(s => allLoading[s.id] = true);
      setLoadingServices(allLoading);
      // Reset the countdown timer if a global manual check is run
      setTimeUntilNextCheck(600);
    }
    
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const url = serviceId ? `${API_BASE}/auth/system-health?service=${serviceId}` : `${API_BASE}/auth/system-health`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Health check failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      
      setHealthData(prev => {
        const newServices = [...prev.services];
        data.services.forEach(updatedService => {
          const index = newServices.findIndex(s => s.id === updatedService.id);
          if (index !== -1) {
            newServices[index] = updatedService;
          } else {
            newServices.push(updatedService);
          }
        });
        
        const allHealthy = newServices.filter(s => s.status !== 'idle').every(s => s.healthy);
        const anyError = newServices.some(s => s.status === 'error');
        const overallStatus = newServices.some(s => s.status === 'idle') ? 'idle' : (allHealthy ? 'active' : (anyError ? 'error' : 'degraded'));
        
        const newData = {
          ...data,
          services: newServices,
          overall_status: overallStatus
        };
        
        // Persist the latest merged data to localStorage
        localStorage.setItem('ci_admin_health_data', JSON.stringify(newData));
        return newData;
      });
      
      const checkTime = new Date();
      setLastChecked(checkTime);
      localStorage.setItem('ci_admin_health_last_checked', checkTime.toISOString());

      // Append to history log and persist
      setHistory(prev => {
        const newHistory = [
          {
            id: Date.now(),
            time: checkTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            target: serviceId ? serviceId : 'All Services',
            status: data.overall_status,
            latency: data.services.map(s => `${s.id}: ${s.latency_ms}ms`).join(', ')
          },
          ...prev.slice(0, 9)
        ];
        localStorage.setItem('ci_admin_health_history', JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (err) {
      console.error('[HealthCheck] Error:', err);
      setError(err.message || 'Failed to connect to health diagnostics API');
    } finally {
      if (serviceId) {
        setLoadingServices(prev => ({ ...prev, [serviceId]: false }));
      } else {
        setLoadingServices({});
      }
    }
  }, []);

  // Panel entrance animation only
  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
  }, []);

  const services = healthData?.services || DEFAULT_SERVICES;
  const overallHealthy = healthData?.overall_status === 'active';
  const isAnyLoading = Object.values(loadingServices).some(v => v);
  
  // Format timer text (MM:SS)
  const minutes = Math.floor(timeUntilNextCheck / 60);
  const seconds = timeUntilNextCheck % 60;
  const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="system-health-container" ref={panelRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Health Diagnostic Strip */}
      <div className="admin-header-strip glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="admin-header-info">
          <div className="admin-badge-strip" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
            <span className={`admin-live-badge ${overallHealthy ? 'status-ok' : (healthData.overall_status === 'idle' ? 'status-ready' : '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-dot" style={{ background: overallHealthy ? '#10b981' : (healthData.overall_status === 'idle' ? '#fbbf24' : '#ef4444') }}></span>
              {overallHealthy ? 'ALL SYSTEMS OPERATIONAL' : (healthData.overall_status === 'idle' ? 'SYSTEM IDLE / UNTESTED' : 'SYSTEM DEGRADED')}
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Auto-check in {timerText}
            </span>
          </div>
          <h2 className="admin-main-title" style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>
            Connected Services & Infrastructure Health
          </h2>
          <p className="admin-main-desc" style={{ fontSize: '13px', color: '#a1a1aa' }}>
            Individual diagnostic testing for Subsystems. Run checks individually or all at once.
          </p>
        </div>

        <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className={`admin-action-btn primary ${isAnyLoading ? 'spinning' : ''}`}
            onClick={() => runHealthCheck(null)}
            disabled={isAnyLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', cursor: isAnyLoading ? 'not-allowed' : 'pointer' }}
          >
            <svg
              className="refresh-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: isAnyLoading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>{isAnyLoading ? 'Running Tests...' : 'Test All Services'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="chatgpt-alert-box" style={{ display: 'flex', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: '10px', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <strong>Service Diagnostic Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="health-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* Service 1: Supabase PostgreSQL */}
        {(() => {
          const s = services.find(item => item.id === 'supabase_db');
          const isOk = s?.healthy ?? false;
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['supabase_db'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box emerald" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 20 6.48 22 12 22s10-2 10-4.5v-11C22 4.02 17.52 2 12 2z"/><path d="M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5"/><path d="M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Supabase Database</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>PostgreSQL 15 Managed Cluster</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? 'status-active' : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? '#10b981' : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? 'ONLINE' : 'ERROR')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Engine Driver</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.engine || 'postgresql'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Database Host</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.host || 'db.supabase.co'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Port</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.port || '5432'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Connection Pool</span>
                  <span style={{ color: '#10b981' }}>{s?.details?.pool_status || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('supabase_db')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Service 2: SMTP2GO */}
        {(() => {
          const s = services.find(item => item.id === 'smtp2go');
          const isOk = s?.healthy ?? false;
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['smtp2go'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box purple" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>SMTP2GO Email</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Transactional Email Gateway</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? 'status-active' : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? '#10b981' : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? 'ACTIVE' : 'DEGRADED')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Server Host</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.host || 'mail.smtp2go.com'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Port</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.port || '2525'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Auth Mechanism</span>
                  <span style={{ color: '#ffffff' }}>{s?.details?.auth_type || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Sender Address</span>
                  <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>{s?.details?.from_email || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('smtp2go')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Service 3: WebSocket */}
        {(() => {
          const s = services.find(item => item.id === 'websocket_core');
          const isOk = s?.healthy ?? false;
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['websocket_core'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box cyan" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>WebSocket Telemetry</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>FastAPI Real-Time Gateway</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? 'status-active' : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? '#10b981' : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? 'LISTENING' : 'OFFLINE')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Endpoint URI</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.endpoint || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Active Broadcast Clients</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{s?.details?.active_clients ?? '...'} client(s)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Core Telemetry</span>
                  <span style={{ color: '#ffffff' }}>{s?.details?.orchestrator_modules || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('websocket_core')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}
        
        {/* Service 4: Cloudflare R2 */}
        {(() => {
          const s = services.find(item => item.id === 'cloudflare_r2');
          const isOk = s?.healthy ?? false;
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['cloudflare_r2'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box orange" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Cloudflare R2</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Blob Storage Bucket</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? 'status-active' : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? '#10b981' : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? 'CONNECTED' : 'ERROR')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Endpoint</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{s?.details?.endpoint || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Bucket Name</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.bucket || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Access Keys</span>
                  <span style={{ color: '#ffffff' }}>{s?.details?.access_key || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('cloudflare_r2')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Service 4.5: Data Sources */}
        {(() => {
          const s = services.find(item => item.id === 'data_sources');
          const isOk = s?.healthy ?? false;
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['data_sources'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box pink" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Data Sources</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>SO, GitHub, HN APIs</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? 'status-active' : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? '#10b981' : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? 'ONLINE' : 'DEGRADED')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Stack Overflow</span>
                  <span style={{ color: s?.details?.stackoverflow === 'OK' ? '#10b981' : '#ef4444', fontFamily: 'JetBrains Mono' }}>{s?.details?.stackoverflow || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>GitHub</span>
                  <span style={{ color: s?.details?.github === 'OK' ? '#10b981' : '#ef4444', fontFamily: 'JetBrains Mono' }}>{s?.details?.github || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>HackerNews</span>
                  <span style={{ color: s?.details?.hackernews === 'OK' ? '#10b981' : '#ef4444', fontFamily: 'JetBrains Mono' }}>{s?.details?.hackernews || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('data_sources')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Service 5: LLM API Providers */}
        {(() => {
          const s = services.find(item => item.id === 'llm_api');
          const isOk = s?.healthy ?? false;
          const isDegraded = s?.status === 'degraded';
          const isIdle = s?.status === 'idle';
          const isLoading = loadingServices['llm_api'];
          
          return (
            <div className="glass-card service-health-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '12px', background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="header-icon-box blue" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>LLM API Gateway</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Official Providers & Fallback</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isIdle ? 'status-ready' : (isOk ? (isDegraded ? 'status-ready' : 'status-active') : 'status-ready')}`} style={{ fontSize: '11px', background: isIdle ? 'rgba(251, 191, 36, 0.2)' : (isOk ? (isDegraded ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)') : 'rgba(239, 68, 68, 0.2)'), color: isIdle ? '#fbbf24' : (isOk ? (isDegraded ? '#fbbf24' : '#10b981') : '#ef4444') }}>
                    {isIdle ? 'UNTESTED' : (isOk ? (isDegraded ? 'G4F FALLBACK' : 'CONNECTED') : 'ERROR')}
                  </span>
                  {!isIdle && s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Configured Keys</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.configured_keys || '...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Default Provider</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.default || '...'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s?.message}
                </p>
                <button 
                  className="admin-action-btn secondary" 
                  onClick={() => runHealthCheck('llm_api')}
                  disabled={isLoading}
                  style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '10px' }}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Health Check History Log */}
      <div className="glass-card telemetry-card" style={{ padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Diagnostic History</h3>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              Historical log of on-demand health tests.
            </span>
          </div>
          {lastChecked && (
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              Last executed: <strong>{lastChecked.toLocaleTimeString()}</strong>
            </span>
          )}
        </div>

        <div className="table-responsive">
          <table className="modern-admin-table" style={{ width: '100%', fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th>Execution Time</th>
                <th>Target</th>
                <th>Overall Status</th>
                <th>Latency Results</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#a1a1aa' }}>
                    No health diagnostics recorded yet.
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{item.time}</td>
                    <td>
                      <span className="badge-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        {item.target}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: item.status === 'active' ? '#10b981' : (item.status === 'error' ? '#ef4444' : '#fbbf24'), fontWeight: 600 }}>
                        {item.status === 'active' ? '✓ HEALTHY' : (item.status === 'error' ? '⚠ ERROR' : (item.status === 'idle' ? 'IDLE' : '⚠ DEGRADED'))}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#a1a1aa' }}>{item.latency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
