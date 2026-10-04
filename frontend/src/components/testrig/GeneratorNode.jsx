import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function GeneratorNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleExecute = async () => {
    if (!data.inputData || !data.query) {
      alert("Missing M4 data or initial query!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/testrig/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: data.query,
          m4_data: data.inputData
        })
      });
      
      const finalOutput = await response.json();
      setOutputJson(finalOutput);
      
      if (data.onExecute) {
        data.onExecute(finalOutput);
      }
    } catch (err) {
      console.error(err);
      setOutputJson({ error: "Failed to generate response." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #14b8a6', // Teal color for final output
      borderRadius: '12px',
      minWidth: '350px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(20, 184, 166, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#14b8a6', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#14b8a6', boxShadow: '0 0 10px #14b8a6' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Response Gen (M5)</h3>
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
            disabled={isLoading || !data.inputData}
            style={{
              background: isLoading ? 'transparent' : '#14b8a6',
              border: isLoading ? '1px solid #14b8a6' : 'none',
              color: isLoading ? '#14b8a6' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !data.inputData) ? 'not-allowed' : 'pointer',
              opacity: (!data.inputData) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Generating...' : 'Generate Answer'}
          </button>
        </div>
      </div>
      
      {/* BODY */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
          <span>M4 Judgement</span>
          <span style={{ color: data.inputData ? '#14b8a6' : '#ef4444' }}>{data.inputData ? 'Received' : 'Waiting...'}</span>
        </div>

        {outputJson && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
                background: '#09090b', padding: '16px', borderRadius: '8px', 
                border: outputJson.enforced_status === 'abstain_insufficient_evidence' ? '1px solid #ef4444' : 
                        outputJson.enforced_status === 'contested_high_uncertainty' ? '1px solid #f59e0b' : '1px solid #27272a'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ 
                  fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                  background: outputJson.enforced_status === 'abstain_insufficient_evidence' ? '#7f1d1d' : 
                              outputJson.enforced_status === 'contested_high_uncertainty' ? '#78350f' : '#064e3b',
                  color: outputJson.enforced_status === 'abstain_insufficient_evidence' ? '#fca5a5' : 
                         outputJson.enforced_status === 'contested_high_uncertainty' ? '#fcd34d' : '#6ee7b7'
                }}>
                  {outputJson.enforced_status.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold' }}>
                  Confidence: {outputJson.confidence_percent}%
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {outputJson.final_response}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* INFO MODAL */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '350px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #14b8a6', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M5 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 'bold' }}>Evidence-Grounded Generation</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                This node uses the LLM to write the final response to the user. It is strictly constrained by the mathematical judgements from M4.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 'bold' }}>Enforcing Abstention</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                If M4 flagged the output as <code>abstain</code> or <code>contested</code>, M5's system prompt dynamically shifts to force the LLM to warn the user or gracefully refuse the answer, preventing hallucination.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
