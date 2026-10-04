import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function ClassifierNode({ data }) {
  const [outputJson, setOutputJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleExecute = async () => {
    const inputData = data.inputData;
    if (!inputData || !inputData.data || !inputData.data.text) {
      setOutputJson({ error: "No input data received. Connect and execute the Input Node first." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/testrig/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputData.data.text })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Classification request failed');
      }

      const result = await res.json();
      const finalOutput = {
        type: "classifier_node",
        timestamp: new Date().toISOString(),
        routing: {
          destination: result.destination,
          confidence: result.confidence,
          probabilities: result.probabilities,
        },
        payload: inputData.data,
        destination: result.destination, // Flatten for the Decision Node
        query: inputData.data.text // Forward the query text
      };
      
      setOutputJson(finalOutput);
      if (data.onExecute) {
        data.onExecute(finalOutput);
      }
    } catch (err) {
      console.error(err);
      setOutputJson({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ width: '350px', borderTop: '4px solid #a855f7', padding: '0', overflow: 'hidden' }}>
      
      {/* INPUT HANDLE */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#a855f7', width: '30px', height: '20px', left: '-8px', border: '2px solid #fff' }} 
      />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', color: '#a855f7', marginRight: '12px' }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4"></path>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '14px', fontWeight: '600' }}>Heuristic Classifier</h3>
          <span style={{ color: '#a1a1aa', fontSize: '11px' }}>Router Node</span>
        </div>
        <button 
          onClick={handleExecute}
          disabled={isLoading}
          style={{
            background: isLoading ? '#6b21a8' : '#a855f7',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Classifying...' : 'Execute'}
        </button>
      </div>
      
      {/* BODY - PARAMETERS */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            <span>Input Data</span>
            <span style={{ color: data.inputData ? '#10b981' : '#ef4444' }}>
              {data.inputData ? 'Connected' : 'Waiting...'}
            </span>
          </label>
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', 
            border: '1px dashed rgba(255,255,255,0.2)', fontSize: '11px', color: '#e4e4e7',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {data.inputData ? JSON.stringify(data.inputData.data) : '{ No data passed from previous node }'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
          <svg width="14" height="14" fill="none" stroke="#a855f7" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <span style={{ color: '#c4b5fd', fontSize: '11px' }}>TF-IDF + Naive Bayes (Trained on 500+ samples)</span>
        </div>
      </div>

      {/* BODY - OUTPUT */}
      {outputJson && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: '#a855f7', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', margin: 0 }}>
              Output (JSON)
            </label>
            {outputJson.routing?.prediction_raw?.startsWith('LLM Override') && (
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                LLM OVERRIDE ACTIVE
              </span>
            )}
          </div>
          <pre style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            padding: '12px', 
            borderRadius: '6px', 
            color: '#d8b4fe',
            border: '1px solid rgba(168, 85, 247, 0.2)',
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
        style={{ background: '#a855f7', width: '30px', height: '20px', right: '-8px', border: '2px solid #fff' }} 
      />
    </div>
  );
}
