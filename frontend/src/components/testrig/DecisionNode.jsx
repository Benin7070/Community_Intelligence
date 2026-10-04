import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

export default function DecisionNode({ id, data, isConnectable }) {
  const [activePath, setActivePath] = useState(null);
  
  // Persistent rule: { key: 'destination', value: 'CI_SYSTEM' }
  const [rule, setRule] = useState(() => {
    const saved = localStorage.getItem(`decisionNodeRule_${id}`);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (rule) {
      localStorage.setItem(`decisionNodeRule_${id}`, JSON.stringify(rule));
    }
  }, [rule, id]);

  useEffect(() => {
    if (data.inputData && rule) {
      // Evaluate the condition
      const isTrue = data.inputData[rule.key] === rule.value;
      const path = isTrue ? 'TRUE' : 'FALSE';
      
      // Delay execution slightly so the UI updates
      setTimeout(() => {
        setActivePath(path);
        if (data.onExecute) {
          data.onExecute(data.inputData, path);
        }
      }, 500);
    }
  }, [data.inputData, rule, data]);

  const handleSetRule = (key, value) => {
    setRule({ key, value });
    setActivePath(null); // Reset active path on rule change
  };

  const renderInputData = () => {
    if (!data.inputData) return <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Waiting for input data...</div>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>Click a property to set as the True condition:</div>
        {Object.entries(data.inputData).map(([k, v]) => {
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            const isCurrentRule = rule && rule.key === k && rule.value === v;
            return (
              <div 
                key={k} 
                onClick={() => handleSetRule(k, v)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '6px 8px', 
                  background: isCurrentRule ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', 
                  border: isCurrentRule ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s'
                }}
              >
                <span style={{ color: '#e4e4e7', fontWeight: 'bold' }}>{k}</span>
                <span style={{ color: '#38bdf8' }}>{String(v)}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #eab308',
      borderRadius: '12px',
      minWidth: '280px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(234, 179, 8, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#eab308', width: '12px', height: '12px' }} />
      
      {/* HEADER */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', boxShadow: '0 0 10px #eab308' }}></div>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>Generic Router</h3>
      </div>
      
      {/* RULE DISPLAY */}
      <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {rule ? (
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#a1a1aa' }}>IF </span>
            <strong style={{ color: '#eab308' }}>{rule.key}</strong>
            <span style={{ color: '#a1a1aa' }}> === </span>
            <strong style={{ color: '#eab308' }}>{String(rule.value)}</strong>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#ef4444' }}>No routing rule configured.</div>
        )}
      </div>
      
      {/* INPUT DATA EXPLORER */}
      <div style={{ padding: '16px' }}>
        {renderInputData()}
      </div>

      {/* PATH INDICATORS */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ 
          padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
          background: activePath === 'TRUE' ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
          color: activePath === 'TRUE' ? '#fff' : '#10b981',
          transition: 'all 0.3s'
        }}>
          ➔ TRUE Path
        </div>
        <div style={{ 
          padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
          background: activePath === 'FALSE' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
          color: activePath === 'FALSE' ? '#fff' : '#ef4444',
          transition: 'all 0.3s'
        }}>
          ➔ FALSE Path
        </div>
      </div>

      {/* CUSTOM HANDLES FOR ROUTING */}
      <Handle type="source" position={Position.Right} id="TRUE" isConnectable={isConnectable} style={{ background: '#10b981', width: '12px', height: '12px', top: '75%' }} />
      <Handle type="source" position={Position.Right} id="FALSE" isConnectable={isConnectable} style={{ background: '#ef4444', width: '12px', height: '12px', top: '88%' }} />
    </div>
  );
}
