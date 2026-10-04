import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function ReliabilityNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleExecute = async () => {
    if (!data.m1Data || !data.m3Data) {
      alert("Missing inputs! M4 requires both M1 (Raw Data) and M3 (Clusters) to run.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/testrig/reliability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusters_data: data.m3Data,
          acquired_data: data.m1Data
        })
      });
      
      const finalOutput = await response.json();
      setOutputJson(finalOutput);
      
      if (data.onExecute) {
        data.onExecute(finalOutput);
      }
    } catch (err) {
      console.error(err);
      setOutputJson({ error: "Failed to calculate reliability." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #f59e0b', // Amber/Gold for judgement
      borderRadius: '12px',
      minWidth: '400px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 158, 11, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      {/* 2 Input Handles (M1 and M3) */}
      <Handle type="target" position={Position.Left} id="m1-input" isConnectable={isConnectable} style={{ top: '30%', background: '#f59e0b', width: '12px', height: '12px' }} />
      <Handle type="target" position={Position.Left} id="m3-input" isConnectable={isConnectable} style={{ top: '70%', background: '#f59e0b', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Reliability & Signals (M4)</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#a1a1aa',
              padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer'
            }}
          >
            Info
          </button>
          <button 
            onClick={handleExecute}
            disabled={isLoading || !data.m1Data || !data.m3Data}
            style={{
              background: isLoading ? 'transparent' : '#f59e0b',
              border: isLoading ? '1px solid #f59e0b' : 'none',
              color: isLoading ? '#f59e0b' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !data.m1Data || !data.m3Data) ? 'not-allowed' : 'pointer',
              opacity: (!data.m1Data || !data.m3Data) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Calculating...' : 'Run Calculator'}
          </button>
        </div>
      </div>
      
      {/* BODY */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            <span>M1 Raw Metadata</span>
            <span style={{ color: data.m1Data ? '#f59e0b' : '#ef4444' }}>{data.m1Data ? 'Connected' : 'Waiting...'}</span>
          </label>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            <span>M3 Clustered Claims</span>
            <span style={{ color: data.m3Data ? '#f59e0b' : '#ef4444' }}>{data.m3Data ? 'Connected' : 'Waiting...'}</span>
          </label>
        </div>

        {outputJson && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              Ranked Math Results (JSON)
            </label>
            <div style={{ position: 'relative', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a', maxHeight: '250px', overflowY: 'auto' }}>
              <button 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))}
                style={{
                  position: 'absolute', top: '8px', right: '8px', background: 'rgba(245, 158, 11, 0.2)', 
                  border: '1px solid rgba(245, 158, 11, 0.5)', color: '#fcd34d', borderRadius: '4px',
                  padding: '2px 6px', fontSize: '10px', cursor: 'pointer'
                }}
                title="Copy JSON"
              >
                Copy
              </button>
              <pre style={{ margin: 0, fontSize: '11px', color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(outputJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#f59e0b', width: '12px', height: '12px' }} />

      {/* INFO MODAL */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '450px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M4 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>Deterministic IEEE Math (No LLM)</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                This node completely bypasses the LLM to prevent hallucination. It uses the <code>post_id</code> from M3 to grab the raw Reputation and Metadata from M1, and runs a strict scoring algorithm.
                It uses Logarithmic Normalization <code>log(1+v)</code> and Exponential Time Decay <code>e^(-lambda * dt)</code>.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>Bayesian Uncertainty (Abstention)</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                Using a Sigmoid function, the system calculates a true Confidence Score. If the score is too low or community conflict is too high, it triggers an <code>abstain</code> status rather than guessing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
