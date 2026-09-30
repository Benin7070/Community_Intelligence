import React, { useState, useEffect, useRef, useCallback } from 'react';
import { animatePanelEntrance } from '../../utils/motion';
import { API_BASE } from '../../config';

const AUTO_CHECK_SECONDS = 10 * 60; // 10 minutes = 600 seconds

export default function SystemHealthView() {
  const panelRef = useRef(null);

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CHECK_SECONDS);
  const [history, setHistory] = useState([]);

  const runHealthCheck = useCallback(async (isManual = false) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/auth/system-health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Health check failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      setHealthData(data);
      const checkTime = new Date();
      setLastChecked(checkTime);
      setSecondsLeft(AUTO_CHECK_SECONDS);

      // Append to history log
      setHistory(prev => [
        {
          id: Date.now(),
          time: checkTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: data.overall_status,
          supabaseLatency: data.services?.find(s => s.id === 'supabase_db')?.latency_ms || 0,
          smtpLatency: data.services?.find(s => s.id === 'smtp2go')?.latency_ms || 0,
          wsLatency: data.services?.find(s => s.id === 'websocket_core')?.latency_ms || 0,
          manual: isManual
        },
        ...prev.slice(0, 9) // Keep last 10
      ]);
    } catch (err) {
      console.error('[HealthCheck] Error:', err);
      setError(err.message || 'Failed to connect to health diagnostics API');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial check and panel entrance animation
  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
    runHealthCheck();
  }, [runHealthCheck]);

  // 1-second interval to update countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          runHealthCheck();
          return AUTO_CHECK_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [runHealthCheck]);

  // Format countdown mm:ss
  const formatCountdown = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const services = healthData?.services || [];
  const overallHealthy = healthData?.overall_status === 'active';

  return (
    <div className="system-health-container" ref={panelRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Health Diagnostic Strip */}
      <div className="admin-header-strip glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="admin-header-info">
          <div className="admin-badge-strip" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
            <span className={`admin-live-badge ${overallHealthy ? 'status-ok' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-dot" style={{ background: overallHealthy ? '#10b981' : '#ef4444' }}></span>
              {overallHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM DEGRADED'}
            </span>
            <span className="db-chip" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '16px', fontSize: '12px' }}>
              Auto-Check: Every 10 min
            </span>
          </div>
          <h2 className="admin-main-title" style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>
            Connected Services & Infrastructure Health
          </h2>
          <p className="admin-main-desc" style={{ fontSize: '13px', color: '#a1a1aa' }}>
            Automated 10-minute diagnostic polling verifying SMTP2GO transactional mailer and Supabase PostgreSQL persistence.
          </p>
        </div>

        <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="countdown-pill" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '6px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Auto-Test In</span>
            <strong style={{ fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#38bdf8' }}>
              {formatCountdown(secondsLeft)}
            </strong>
          </div>

          <button
            className={`admin-action-btn primary ${loading ? 'spinning' : ''}`}
            onClick={() => runHealthCheck(true)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <svg
              className="refresh-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>{loading ? 'Running Test...' : 'Test Now'}</span>
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

      {/* Services Grid (Supabase, SMTP2GO, WebSocket Gateway) */}
      <div className="health-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* Service 1: Supabase PostgreSQL */}
        {(() => {
          const s = services.find(item => item.id === 'supabase_db');
          const isOk = s?.healthy ?? false;
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
                  <span className={`status-pill ${isOk ? 'status-active' : 'status-ready'}`} style={{ fontSize: '11px', background: isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isOk ? '#10b981' : '#ef4444' }}>
                    {isOk ? 'ONLINE' : 'ERROR'}
                  </span>
                  {s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Engine Driver</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.engine || 'postgresql+psycopg2'}</span>
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
                  <span style={{ color: '#10b981' }}>{s?.details?.pool_status || 'Connected'}</span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                {s?.message || 'Testing live connection via SELECT 1 query execution...'}
              </p>
            </div>
          );
        })()}

        {/* Service 2: SMTP2GO Official Mailer */}
        {(() => {
          const s = services.find(item => item.id === 'smtp2go');
          const isOk = s?.healthy ?? false;
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
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>SMTP2GO Email Gateway</h3>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Transactional OTP & Password Delivery</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isOk ? 'status-active' : 'status-ready'}`} style={{ fontSize: '11px', background: isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isOk ? '#10b981' : '#ef4444' }}>
                    {isOk ? 'ACTIVE' : 'DEGRADED'}
                  </span>
                  {s && (
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
                  <span style={{ color: '#ffffff' }}>{s?.details?.auth_type || 'SMTP2GO API Key'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Sender Address</span>
                  <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>{s?.details?.from_email || 'noreply@ci.aether70.me'}</span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                {s?.message || 'Testing live TCP socket and SMTP handshake to SMTP2GO servers...'}
              </p>
            </div>
          );
        })()}

        {/* Service 3: Real-Time WebSocket Telemetry Gateway */}
        {(() => {
          const s = services.find(item => item.id === 'websocket_core');
          const isOk = s?.healthy ?? false;
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
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>FastAPI Real-Time Connection Manager</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`status-pill ${isOk ? 'status-active' : 'status-ready'}`} style={{ fontSize: '11px', background: isOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isOk ? '#10b981' : '#ef4444' }}>
                    {isOk ? 'LISTENING' : 'OFFLINE'}
                  </span>
                  {s && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>
                      {s.latency_ms} ms ping
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Endpoint URI</span>
                  <span style={{ color: '#ffffff', fontFamily: 'JetBrains Mono' }}>{s?.details?.endpoint || '/ws/pipeline'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Active Broadcast Clients</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{s?.details?.active_clients ?? 1} client(s)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a1a1aa' }}>Core Telemetry</span>
                  <span style={{ color: '#ffffff' }}>{s?.details?.orchestrator_modules || 'Modules 3.1 - 3.7 Ready'}</span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                {s?.message || 'Streaming pipeline events to live connected clients...'}
              </p>
            </div>
          );
        })()}

      </div>

      {/* Health Check History Log */}
      <div className="glass-card telemetry-card" style={{ padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Diagnostic History & Latency Log</h3>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              Historical log of automatic (every 10m) and on-demand health tests.
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
                <th>Trigger Source</th>
                <th>Overall Status</th>
                <th>Supabase Ping</th>
                <th>SMTP2GO Ping</th>
                <th>WebSocket Ping</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#a1a1aa' }}>
                    No health diagnostics recorded yet.
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{item.time}</td>
                    <td>
                      <span className="badge-tag" style={{ background: item.manual ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.08)', color: item.manual ? '#38bdf8' : '#ffffff' }}>
                        {item.manual ? 'Manual Trigger' : '10-Min Auto Poll'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: item.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {item.status === 'active' ? '✓ HEALTHY' : '⚠ ATTENTION'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{item.supabaseLatency} ms</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{item.smtpLatency} ms</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>{item.wsLatency} ms</td>
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
