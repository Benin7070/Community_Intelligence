import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function SynthesisNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleExecute = async () => {
    if (!data.inputData) {
      alert("No input data received from M2 Claim Modeling node!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/testrig/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claims_data: data.inputData
        })
      });
      
      const finalOutput = await response.json();
      setOutputJson(finalOutput);
      
      if (data.onExecute) {
        data.onExecute(finalOutput);
      }
    } catch (err) {
      console.error(err);
      setOutputJson({ error: "Failed to synthesize claims." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #10b981', // Emerald green for synthesis
      borderRadius: '12px',
      minWidth: '350px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#10b981', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Evidence Assessment (M3)</h3>
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
              background: isLoading ? 'transparent' : '#10b981',
              border: isLoading ? '1px solid #10b981' : 'none',
              color: isLoading ? '#10b981' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !data.inputData) ? 'not-allowed' : 'pointer',
              opacity: (!data.inputData) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Synthesizing...' : 'Run Synthesis'}
          </button>
        </div>
      </div>
      
      {/* BODY */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            <span>Input Claims</span>
            <span style={{ color: data.inputData ? '#10b981' : '#ef4444' }}>
              {data.inputData ? 'Connected' : 'Waiting...'}
            </span>
          </label>
        </div>

        {outputJson && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              Distinct Clusters (JSON)
            </label>
            <div style={{ position: 'relative', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a', maxHeight: '250px', overflowY: 'auto' }}>
              <button 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))}
                style={{
                  position: 'absolute', top: '8px', right: '8px', background: 'rgba(16, 185, 129, 0.2)', 
                  border: '1px solid rgba(16, 185, 129, 0.5)', color: '#6ee7b7', borderRadius: '4px',
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

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#10b981', width: '12px', height: '12px' }} />

      {/* INFO MODAL */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '450px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #10b981', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M3 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Semantic Clustering (Deduplication)</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                This node takes the raw, duplicated array of claims from M2 and uses an LLM to find semantically identical arguments. It merges them into distinct <strong>Clusters</strong>.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Evidence Mapping</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                When claims are merged, their original <code>post_id</code>s are combined into an array of <code>supporting_claim_ids</code>, and a <code>support_count</code> is generated. This allows the M4 node to mathematically weigh the credibility of each distinct solution!
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Output Example</label>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                <pre style={{ margin: 0 }}>
{JSON.stringify({
  "clusters": [
    {
      "distinct_argument": "Update Vite to 6.1",
      "supporting_claim_ids": ["1", "5", "8"],
      "support_count": 3
    }
  ]
}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
