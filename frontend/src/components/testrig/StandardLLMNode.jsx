import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

export default function StandardLLMNode({ data, isConnectable }) {
  const [outputJson, setOutputJson] = useState(null);

  useEffect(() => {
    if (data.inputData) {
      // Simulate standard LLM processing
      setTimeout(() => {
        const out = {
          _meta: { node: "Standard LLM", status: "completed" },
          query: data.inputData.query,
          response: "This is a generic LLM response bypassing the CI pipeline."
        };
        setOutputJson(out);
        if (data.onExecute) data.onExecute(out);
      }, 800);
    }
  }, [data.inputData, data.onExecute]);

  return (
    <div className="testrig-node" style={{ borderColor: '#38bdf8' }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      
      <div className="node-header" style={{ borderBottomColor: '#38bdf8' }}>
        <div className="node-icon" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>LLM</div>
        <div className="node-title">
          Standard LLM
          <div className="node-subtitle">Generic Fallback Generation</div>
        </div>
      </div>

      <div className="node-content">
        {!data.inputData ? (
          <div className="waiting-text">Waiting for generic query...</div>
        ) : (
          <div className="success-text">Generated standard response</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
}
