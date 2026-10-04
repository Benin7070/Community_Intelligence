import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle } from 'lucide-react';

export default function OutputNode({ data, isConnectable }) {
  const [outputJson, setOutputJson] = useState(null);

  useEffect(() => {
    // If we receive data from either the CI pipeline or the Standard LLM, process it
    if (data.ciData || data.llmData) {
      const finalData = data.ciData || data.llmData;
      setOutputJson(finalData);
    }
  }, [data.ciData, data.llmData]);

  return (
    <div className="testrig-node" style={{ borderColor: '#ec4899' }}>
      <Handle type="target" position={Position.Left} id="ci-input" isConnectable={isConnectable} style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="llm-input" isConnectable={isConnectable} style={{ top: '70%' }} />
      
      <div className="node-header" style={{ borderBottomColor: '#ec4899' }}>
        <div className="node-icon" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899' }}>
          <CheckCircle size={16} />
        </div>
        <div className="node-title">
          Final Output
          <div className="node-subtitle">API Response Interface</div>
        </div>
      </div>

      <div className="node-content">
        {!outputJson ? (
          <div className="waiting-text">Waiting for pipeline completion...</div>
        ) : (
          <div>
            <div className="success-text" style={{ marginBottom: '8px' }}>Response Ready!</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Source: {outputJson._meta?.node || 'CI Pipeline'}
            </div>
            {outputJson.headline_answer && (
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '8px', fontStyle: 'italic' }}>
                "{outputJson.headline_answer.substring(0, 50)}..."
              </div>
            )}
            {outputJson.response && (
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '8px', fontStyle: 'italic' }}>
                "{outputJson.response.substring(0, 50)}..."
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
