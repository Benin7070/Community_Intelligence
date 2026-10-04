import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../../config';
import { animatePanelEntrance } from '../../utils/motion';

export default function ControlCenterView() {
  const panelRef = useRef(null);
  const [siteSettings, setSiteSettings] = useState({ 
    maintenance_mode: 0, 
    maintenance_message: 'Site is under maintenance.', 
    email_alerts_enabled: 1, 
    pipeline_mode: 'real',
    competitor_model: 'gpt-4o'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast({ show: false, message: '', isError: false });
    }, 3500);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/settings`);
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
      }
    } catch (err) {
      console.error('Failed to load site settings', err);
    }
  }, []);

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdateSettings = async (updates) => {
    setSettingsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...siteSettings, ...updates })
      });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
        showToast('Site settings updated successfully');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div ref={panelRef} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {toast.show && (
        <div className={`admin-toast ${toast.isError ? 'error' : 'success'}`} style={{ display: 'flex' }}>
          <span>{toast.message}</span>
        </div>
      )}
      
      {/* Pipeline Control Center */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '24px', borderLeft: '4px solid #3b82f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Pipeline Control Center</h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              Select which intelligence pipeline powers the Live Console Canvas.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`role-toggle-btn ${siteSettings.pipeline_mode === 'llm' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.pipeline_mode === 'llm' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.pipeline_mode === 'llm' ? '#3b82f6' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.pipeline_mode === 'llm' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ pipeline_mode: 'llm' })}
              disabled={settingsLoading || siteSettings.pipeline_mode === 'llm'}
            >
              Standard LLM
            </button>
            <button
              className={`role-toggle-btn ${siteSettings.pipeline_mode === 'mock' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.pipeline_mode === 'mock' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.pipeline_mode === 'mock' ? '#a855f7' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.pipeline_mode === 'mock' ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ pipeline_mode: 'mock' })}
              disabled={settingsLoading || siteSettings.pipeline_mode === 'mock'}
            >
              CI (Mock Data)
            </button>
            <button
              className={`role-toggle-btn ${siteSettings.pipeline_mode === 'real' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.pipeline_mode === 'real' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.pipeline_mode === 'real' ? '#10b981' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.pipeline_mode === 'real' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ pipeline_mode: 'real' })}
              disabled={settingsLoading || siteSettings.pipeline_mode === 'real'}
            >
              CI (Real Web Search)
            </button>
          </div>
        </div>
      </div>

      {/* Competitor Model Center */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '24px', borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Competitor Baseline Model</h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              Select the baseline AI model to display alongside the Community Intelligence pipeline results.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`role-toggle-btn ${siteSettings.competitor_model === 'gpt-4o' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.competitor_model === 'gpt-4o' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.competitor_model === 'gpt-4o' ? '#f59e0b' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.competitor_model === 'gpt-4o' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ competitor_model: 'gpt-4o' })}
              disabled={settingsLoading || siteSettings.competitor_model === 'gpt-4o'}
            >
              GPT-4o
            </button>
            <button
              className={`role-toggle-btn ${siteSettings.competitor_model === 'claude-3.5-sonnet' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.competitor_model === 'claude-3.5-sonnet' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.competitor_model === 'claude-3.5-sonnet' ? '#f59e0b' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.competitor_model === 'claude-3.5-sonnet' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ competitor_model: 'claude-3.5-sonnet' })}
              disabled={settingsLoading || siteSettings.competitor_model === 'claude-3.5-sonnet'}
            >
              Claude 3.5 Sonnet
            </button>
            <button
              className={`role-toggle-btn ${siteSettings.competitor_model === 'gemini-1.5-pro' ? 'promote' : 'demote'}`}
              style={{ 
                background: siteSettings.competitor_model === 'gemini-1.5-pro' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: siteSettings.competitor_model === 'gemini-1.5-pro' ? '#f59e0b' : '#a1a1aa', 
                padding: '8px 16px', 
                fontWeight: 'bold',
                border: siteSettings.competitor_model === 'gemini-1.5-pro' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => handleUpdateSettings({ competitor_model: 'gemini-1.5-pro' })}
              disabled={settingsLoading || siteSettings.competitor_model === 'gemini-1.5-pro'}
            >
              Gemini 1.5 Pro
            </button>
          </div>
        </div>
      </div>

      {/* Global Site Maintenance Card */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '24px', borderLeft: siteSettings.maintenance_mode === 1 ? '4px solid #ef4444' : '4px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Global Maintenance Mode</h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              When active, all non-admin users will see the maintenance screen and cannot access the pipeline.
            </p>
          </div>
          <button
            className={`role-toggle-btn ${siteSettings.maintenance_mode === 1 ? 'promote' : 'demote'}`}
            style={{ background: siteSettings.maintenance_mode === 1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: siteSettings.maintenance_mode === 1 ? '#ef4444' : '#10b981', padding: '8px 16px', fontWeight: 'bold' }}
            onClick={() => handleUpdateSettings({ maintenance_mode: siteSettings.maintenance_mode === 1 ? 0 : 1 })}
            disabled={settingsLoading}
          >
            {siteSettings.maintenance_mode === 1 ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}
          </button>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="chatgpt-label" style={{ fontSize: '12px' }}>Maintenance Screen Message</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="chatgpt-input"
              value={siteSettings.maintenance_message}
              onChange={(e) => setSiteSettings(prev => ({ ...prev, maintenance_message: e.target.value }))}
              style={{ flex: 1 }}
            />
            <button 
              className="admin-action-btn primary" 
              onClick={() => handleUpdateSettings({})} 
              disabled={settingsLoading}
            >
              Save Message
            </button>
          </div>
        </div>
      </div>

      {/* Global Email Alerts Card */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '24px', borderLeft: siteSettings.email_alerts_enabled === 1 ? '4px solid #10b981' : '4px solid #ef4444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>System Health Email Alerts</h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              When active, automated emails are sent to admins when system services fail or degrade.
            </p>
          </div>
          <button
            className={`role-toggle-btn ${siteSettings.email_alerts_enabled === 1 ? 'demote' : 'promote'}`}
            style={{ background: siteSettings.email_alerts_enabled === 1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: siteSettings.email_alerts_enabled === 1 ? '#ef4444' : '#10b981', padding: '8px 16px', fontWeight: 'bold' }}
            onClick={() => handleUpdateSettings({ email_alerts_enabled: siteSettings.email_alerts_enabled === 1 ? 0 : 1 })}
            disabled={settingsLoading}
          >
            {siteSettings.email_alerts_enabled === 1 ? 'Turn OFF Alerts' : 'Turn ON Alerts'}
          </button>
        </div>
      </div>
    </div>
  );
}
