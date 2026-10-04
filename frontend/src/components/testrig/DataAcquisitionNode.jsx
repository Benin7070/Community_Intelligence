import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { API_BASE } from '../../config';

export default function DataAcquisitionNode({ data, isConnectable }) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputJson, setOutputJson] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const [sources, setSources] = useState([]);

  // Fetch available sources from the backend (Single Source of Truth)
  useEffect(() => {
    fetch(`${API_BASE}/testrig/m1-sources`)
      .then(res => res.json())
      .then(data => {
        if (data.sources) setSources(data.sources);
      })
      .catch(err => console.error("Failed to load M1 sources:", err));
  }, []);

  const query = data.inputData?.query || '';

  const handleExecute = async () => {
    if (!query) {
      alert("No query received from previous node!");
      return;
    }

    setIsLoading(true);
    try {
      const activeSourceIds = sources.filter(s => s.active).map(s => s.id);
      
      const response = await fetch(`${API_BASE}/testrig/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          active_sources: activeSourceIds
        })
      });
      
      const finalOutput = await response.json();
      setOutputJson(finalOutput);
      
      if (data.onExecute) {
        data.onExecute(finalOutput);
      }
    } catch (err) {
      console.error(err);
      setOutputJson({ error: "Failed to acquire data from backend pipeline" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSource = (id) => {
    setSources(sources.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const updateSourceUrl = (id, newUrl) => {
    setSources(sources.map(s => s.id === id ? { ...s, url: newUrl } : s));
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #0ea5e9',
      borderRadius: '12px',
      minWidth: '350px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(14, 165, 233, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#0ea5e9', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 10px #0ea5e9' }}></div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Data Acquisition (M1)</h3>
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
            onClick={() => setIsEditModalOpen(true)}
            style={{
              background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Edit Sources"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            onClick={handleExecute}
            disabled={isLoading || !data.inputData}
            style={{
              background: isLoading ? 'transparent' : '#0ea5e9',
              border: isLoading ? '1px solid #0ea5e9' : 'none',
              color: isLoading ? '#0ea5e9' : 'white',
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: (isLoading || !data.inputData) ? 'not-allowed' : 'pointer',
              opacity: (!data.inputData) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Fetching...' : 'Acquire Data'}
          </button>
        </div>
      </div>
      
      {/* BODY - PARAMETERS */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            Active Live Sources
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {sources.filter(s => s.active).map(s => (
              <span key={s.id} style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '12px' }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            <span>Input Query</span>
            <span style={{ color: data.inputData ? '#10b981' : '#ef4444' }}>
              {data.inputData ? 'Connected' : 'Waiting...'}
            </span>
          </label>
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', 
            border: '1px dashed rgba(255,255,255,0.2)', fontSize: '11px', color: '#e4e4e7',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {query || '{ No query received }'}
          </div>
        </div>
      </div>

      {/* BODY - OUTPUT */}
      {outputJson && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
          <label style={{ color: '#0ea5e9', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
            Acquired Data (JSON)
          </label>
          <div style={{ position: 'relative', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a', maxHeight: '200px', overflowY: 'auto' }}>
            <button 
              onClick={() => navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))}
              style={{
                position: 'absolute', top: '8px', right: '8px', background: 'rgba(14, 165, 233, 0.2)', 
                border: '1px solid rgba(14, 165, 233, 0.5)', color: '#7dd3fc', borderRadius: '4px',
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
      
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#0ea5e9', width: '12px', height: '12px' }} />

      {/* EDIT SOURCES MODAL */}
      {isEditModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '300px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #0ea5e9', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>Edit Live Sources</h4>
            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sources.map(source => (
              <div key={source.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'white', fontWeight: '600' }}>{source.name}</label>
                  <input type="checkbox" checked={source.active} onChange={() => toggleSource(source.id)} />
                </div>
                <input 
                  type="text" 
                  value={source.url}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.5)', border: '1px solid #3f3f46', color: '#71717a', padding: '6px', fontSize: '10px', borderRadius: '4px', cursor: 'not-allowed' }}
                />
                <div style={{ fontSize: '9px', color: '#52525b', marginTop: '4px' }}>Managed by backend M1 module (Single Source of Truth)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INFO MODAL */}
      {isInfoOpen && (
        <div style={{
          position: 'absolute', top: 0, left: '105%', width: '450px', background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid #0ea5e9', borderRadius: '12px', padding: '16px', zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'white' }}>M1 Node Info</h4>
            <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 'bold' }}>LLM Multi-Query Formulation</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                Primitive Lexical Search APIs (Stack Overflow, GitHub) fail when sent long sentences. 
                This node uses an LLM to formulate 3 distinct optimized search queries to ensure we get results:
              </p>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>A broad 2-keyword query.</li>
                  <li>A specific 3-keyword technical query.</li>
                  <li>A bug/error focused 4-keyword query.</li>
                </ul>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 'bold' }}>Parallel API Requests</label>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                The node fires all 3 AI-generated queries <strong>simultaneously</strong> at all selected platforms. For example, selecting 3 platforms results in 9 parallel requests. It then aggregates the JSON items for the M2 node to process.
              </p>
            </div>
            
            <div>
              <label style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 'bold' }}>Current Live Output (Aggregated JSON)</label>
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
