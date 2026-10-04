import React from 'react';

export default function JsonOutputNode({ data }) {
  return (
    <div className="glass-card" style={{ flex: '1 1 400px', padding: '24px', borderTop: '4px solid #10b981' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
         <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16L8 12L4 8"></path>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16H20"></path>
          </svg>
        </div>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>JSON Output</h3>
      </div>
      
      <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>
        Structured JSON output emitted by the input node.
      </p>

      <pre style={{ 
        background: 'rgba(0, 0, 0, 0.4)', 
        padding: '16px', 
        borderRadius: '8px', 
        color: '#34d399',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        overflowX: 'auto',
        fontSize: '13px',
        fontFamily: 'monospace'
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
