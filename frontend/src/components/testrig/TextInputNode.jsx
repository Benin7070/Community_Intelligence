import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

export default function TextInputNode({ data }) {
  const [inputText, setInputText] = useState('');
  const [outputJson, setOutputJson] = useState(null);

  const handleExecute = () => {
    const output = {
      type: "input_node",
      timestamp: new Date().toISOString(),
      data: {
        text: inputText
      }
    };
    setOutputJson(output);
    if (data.onExecute) data.onExecute(output);
  };

  return (
    <div className="glass-card" style={{ width: '350px', borderTop: '4px solid #f97316', padding: '0', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '6px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '6px', color: '#f97316', marginRight: '12px' }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '14px', fontWeight: '600' }}>Manual Trigger</h3>
          <span style={{ color: '#a1a1aa', fontSize: '11px' }}>Input Node</span>
        </div>
        <button 
          onClick={handleExecute}
          style={{
            background: '#f97316',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Execute
        </button>
      </div>
      
      {/* BODY - PARAMETERS */}
      <div style={{ padding: '16px' }}>
        <label style={{ display: 'block', color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
          Input Text
        </label>
        <textarea
          style={{ 
            width: '100%', 
            minHeight: '80px', 
            resize: 'vertical', 
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '12px'
          }}
          placeholder="Enter raw text to pass to the next node..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      {/* BODY - OUTPUT */}
      {outputJson && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
          <label style={{ display: 'block', color: '#10b981', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            Output (JSON)
          </label>
          <pre style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            padding: '12px', 
            borderRadius: '6px', 
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            overflowX: 'auto',
            fontSize: '11px',
            fontFamily: 'monospace',
            margin: 0
          }}>
            {JSON.stringify(outputJson, null, 2)}
          </pre>
        </div>
      )}

      {/* OUTPUT HANDLE */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#f97316', width: '30px', height: '20px', right: '-8px', border: '2px solid #fff' }} 
      />
    </div>
  );
}
