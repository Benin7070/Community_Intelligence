import React, { useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TextInputNode from '../components/testrig/TextInputNode';
import ClassifierNode from '../components/testrig/ClassifierNode';

const nodeTypes = {
  textInput: TextInputNode,
  classifier: ClassifierNode,
};

const initialNodes = [
  {
    id: 'node-1',
    type: 'textInput',
    position: { x: 50, y: 100 },
    data: { onExecute: null }, // we will update this dynamically
  },
  {
    id: 'node-2',
    type: 'classifier',
    position: { x: 500, y: 100 },
    data: { inputData: null },
  }
];

export default function AdminTestRigView() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);

  // React Flow handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#fff', strokeWidth: 2 } }, eds)),
    []
  );

  // We need to inject the execution callback into node 1 so it can pass data to node 2
  const handleExecuteNode1 = useCallback((output) => {
    // Look at edges to see who is connected to node 1's source
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-1');
      if (connectedEdges.length > 0) {
        // Node 1 is connected to something. Find the targets.
        setNodes(currentNodes => currentNodes.map(n => {
          if (connectedEdges.some(e => e.target === n.id)) {
            // Found a target node, inject the input data
            return { ...n, data: { ...n.data, inputData: output } };
          }
          return n;
        }));
      }
      return currentEdges;
    });
  }, []);

  // Ensure node-1 has the callback
  React.useEffect(() => {
    setNodes(nds => nds.map(n => 
      n.id === 'node-1' ? { ...n, data: { ...n.data, onExecute: handleExecuteNode1 } } : n
    ));
  }, [handleExecuteNode1]);

  return (
    <div className="admin-view-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="admin-view-header">
        <h2 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>Workflow Test Rig</h2>
        <p style={{ color: '#a1a1aa', margin: '8px 0 0', fontSize: '14px' }}>
          Interactive node-based canvas for testing workflows (Powered by React Flow).
        </p>
      </div>

      <div style={{ flex: 1, marginTop: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
          style={{ background: '#121212' }}
        >
          <Background color="#333" gap={16} />
          <Controls style={{ background: '#1e1e1e', color: '#fff' }} />
        </ReactFlow>
      </div>
    </div>
  );
}
