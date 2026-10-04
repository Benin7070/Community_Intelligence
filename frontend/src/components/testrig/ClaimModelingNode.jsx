import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function ClaimModelingNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // The input is exactly what the M1 node outputs
  const acquiredData = data.inputData?.acquired_data;

  const handleExecute = async () => {
    if (!acquiredData) {
      alert("No acquired data received from the previous Data Acquisition node!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/testrig/model-claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acquired_data: acquiredData })
      });

      if (!response.ok) throw new Error("Failed to model claims");
      const json = await response.json();
      setOutputJson(json);
      
      if (data.onExecute) {
        data.onExecute({
          type: "claim_modeling_node",
          claims: json.claims
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error executing Claim Modeling");
      setOutputJson({ error: "Failed to model claims from backend pipeline" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(30, 27, 75, 0.95)',
      border: '1px solid #8b5cf6',
      borderRadius: '12px',
      minWidth: '400px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      fontFamily: 'sans-serif'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#8b5cf6', width: '12px', height: '12px' }} />
      
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 10px #8b5cf6' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Claim & Context Modeling (M2)</h3>
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
            disabled={isLoading || !acquiredData}
            style={{
              background: isLoading ? 'transparent' : '#8b5cf6',
              border: isLoading ? '1px solid #8b5cf6' : 'none',
              color: isLoading ? '#8b5cf6' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !acquiredData) ? 'not-allowed' : 'pointer',
              opacity: (!acquiredData) ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Modeling...' : 'Extract Claims'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '12px' }}>
          <span style={{ color: '#a1a1aa' }}>Input Data</span>
          <span style={{ color: acquiredData ? '#10b981' : '#ef4444' }}>
            {acquiredData ? 'RECEIVED' : 'WAITING...'}
          </span>
        </div>

        {outputJson && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              Extracted Claims (JSON)
            </label>
            <div style={{ position: 'relative', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a', maxHeight: '250px', overflowY: 'auto' }}>
              <button 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))}
                style={{
                  position: 'absolute', top: '8px', right: '8px', background: 'rgba(139, 92, 246, 0.2)', 
                  border: '1px solid rgba(139, 92, 246, 0.5)', color: '#c4b5fd', borderRadius: '4px',
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

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#8b5cf6', width: '12px', height: '12px' }} />

      {/* NODE INFO POPUP */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '450px', background: 'rgba(30, 27, 75, 0.98)',
          border: '1px solid #8b5cf6', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M2 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>What goes into the LLM?</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                To reduce costs and prevent hallucinations, we strip out all HTML, authors, URLs, and metadata. We only send a tightly-packed JSON array containing the <strong>Title</strong> and a strict <strong>600-character snippet of the Body</strong> to the LLM. 
              </p>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                <pre style={{ margin: 0 }}>
{`[
  {
    "id": "1",
    "title": "React Compiler causes memory leaks in Next.js",
    "body_snippet": "I upgraded to React 19 and Next.js 14 and suddenly..."
  }
]`}
                </pre>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>Output Example</label>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                <pre style={{ margin: 0 }}>{JSON.stringify({ "claims": [ { "post_id": "1", "core_claim": "...", "frameworks": ["react"] } ] }, null, 2)}</pre>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>Current Live Output</label>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {outputJson ? JSON.stringify(outputJson, null, 2) : "No output yet. Run the node."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
