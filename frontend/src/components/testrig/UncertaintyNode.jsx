import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function UncertaintyNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleExecute = async () => {
    if (!data.inputData) {
      alert("Missing M4 Judgement data!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/testrig/uncertainty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      setOutputJson({ error: "Failed to run Abstain Guard." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #ef4444', // Red color for Guard/Shield
      borderRadius: '12px',
      minWidth: '350px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#ef4444', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Uncertainty & Abstain (M5)</h3>
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
              background: isLoading ? 'transparent' : '#ef4444',
              border: isLoading ? '1px solid #ef4444' : 'none',
              color: isLoading ? '#ef4444' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !data.inputData) ? 'not-allowed' : 'pointer',
              opacity: (!data.inputData) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Checking Guard...' : 'Run Abstain Guard'}
          </button>
        </div>
      </div>
      
      {/* BODY */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
          <span>M4 Judgement Data</span>
          <span style={{ color: data.inputData ? '#ef4444' : '#52525b' }}>{data.inputData ? 'Received' : 'Waiting...'}</span>
        </div>

        {outputJson && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
                background: '#09090b', padding: '16px', borderRadius: '8px', 
                border: outputJson.guard_action === 'HALT_PIPELINE' ? '1px solid #ef4444' : 
                        outputJson.guard_action === 'PROCEED_WITH_WARNING' ? '1px solid #f59e0b' : '1px solid #10b981'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ 
                  fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase',
                  background: outputJson.guard_action === 'HALT_PIPELINE' ? '#7f1d1d' : 
                              outputJson.guard_action === 'PROCEED_WITH_WARNING' ? '#78350f' : '#064e3b',
                  color: outputJson.guard_action === 'HALT_PIPELINE' ? '#fca5a5' : 
                         outputJson.guard_action === 'PROCEED_WITH_WARNING' ? '#fcd34d' : '#6ee7b7'
                }}>
                  {outputJson.guard_action.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'bold', alignSelf: 'center' }}>
                  Confidence: {outputJson.bayesian_confidence}%
                </span>
              </div>
              
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px' }}>
                <strong>Uncertainty Type:</strong> <span style={{ color: '#ef4444' }}>{outputJson.uncertainty_type}</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5 }}>
                <strong>Calibration Reason:</strong> {outputJson.calibration_reason}
              </p>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#ef4444', width: '12px', height: '12px' }} />

      {/* INFO MODAL */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '350px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #ef4444', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M5 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>Bayesian Calibration Guard</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                This is a pure logic gate. It prevents weak evidence from reaching the final generation step. If confidence is too low, it issues a HALT_PIPELINE command.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>Epistemic vs Aleatoric</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                It explicitly detects if the system lacks data (Epistemic) or if the data is highly conflicting (Aleatoric), and forces the pipeline to adjust its final output accordingly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
