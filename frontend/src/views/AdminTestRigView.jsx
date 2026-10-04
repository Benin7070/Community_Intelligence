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
import DataAcquisitionNode from '../components/testrig/DataAcquisitionNode';
import DecisionNode from '../components/testrig/DecisionNode';
import ClaimModelingNode from '../components/testrig/ClaimModelingNode';
import SynthesisNode from '../components/testrig/SynthesisNode';
import ReliabilityNode from '../components/testrig/ReliabilityNode';
import UncertaintyNode from '../components/testrig/UncertaintyNode';
import StandardLLMNode from '../components/testrig/StandardLLMNode';
import OutputNode from '../components/testrig/OutputNode';
import { API_BASE } from '../config';

const nodeTypes = {
  textInput: TextInputNode,
  classifier: ClassifierNode,
  dataAcquisition: DataAcquisitionNode,
  decision: DecisionNode,
  claimNode: ClaimModelingNode,
  synthesis: SynthesisNode,
  reliability: ReliabilityNode,
  uncertainty: UncertaintyNode,
  standardLLM: StandardLLMNode,
  output: OutputNode,
};

const initialNodes = [
  { id: 'node-1', type: 'textInput', position: { x: 50, y: 150 }, data: { onExecute: null } },
  { id: 'node-2', type: 'classifier', position: { x: 400, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-router', type: 'decision', position: { x: 800, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-3', type: 'dataAcquisition', position: { x: 1200, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-4', type: 'claimNode', position: { x: 1700, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-5', type: 'synthesis', position: { x: 2200, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-6', type: 'reliability', position: { x: 2700, y: 150 }, data: { m1Data: null, m3Data: null, onExecute: null } },
  { id: 'node-7', type: 'uncertainty', position: { x: 3200, y: 150 }, data: { inputData: null, onExecute: null } },
  { id: 'node-llm', type: 'standardLLM', position: { x: 1200, y: 350 }, data: { inputData: null, onExecute: null } },
  { id: 'node-output', type: 'output', position: { x: 3700, y: 250 }, data: { ciData: null, llmData: null } }
];

const initialEdges = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#fff', strokeWidth: 2 } },
  { id: 'e2-r', source: 'node-2', target: 'node-router', animated: true, style: { stroke: '#fff', strokeWidth: 2 } },
  { id: 'er-3', source: 'node-router', sourceHandle: 'TRUE', target: 'node-3', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'er-llm', source: 'node-router', sourceHandle: 'FALSE', target: 'node-llm', animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } },
  { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
  { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'e3-6', source: 'node-3', target: 'node-6', targetHandle: 'm1-input', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e5-6', source: 'node-5', target: 'node-6', targetHandle: 'm3-input', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e6-7', source: 'node-6', target: 'node-7', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
  { id: 'e7-out', source: 'node-7', target: 'node-output', targetHandle: 'ci-input', animated: true, style: { stroke: '#ec4899', strokeWidth: 2 } },
  { id: 'ellm-out', source: 'node-llm', target: 'node-output', targetHandle: 'llm-input', animated: true, style: { stroke: '#ec4899', strokeWidth: 2 } }
];

export default function AdminTestRigView() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#fff', strokeWidth: 2 } }, eds)), []);

  const handleExecuteNode1 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-1');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          if (connectedEdges.some(e => e.target === node.id)) {
            return { ...node, data: { ...node.data, inputData: output } };
          }
          // Also explicitly pass the original query down to the final M5 generator node
          if (node.id === 'node-7') {
            return { ...node, data: { ...node.data, query: output.query } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode2 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-2');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          if (connectedEdges.some(e => e.target === node.id)) {
            return { ...node, data: { ...node.data, inputData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteRouter = useCallback((output, pathId) => {
    // pathId is 'CI_SYSTEM' or 'NORMAL_LLM'
    setEdges(currentEdges => {
      // Find edges that originate from the router's specific sourceHandle
      const connectedEdges = currentEdges.filter(e => e.source === 'node-router' && e.sourceHandle === pathId);
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          if (connectedEdges.some(e => e.target === node.id)) {
            return { ...node, data: { ...node.data, inputData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode3 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-3');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          // Find which edge targets this node
          const edge = connectedEdges.find(e => e.target === node.id);
          if (edge) {
            if (node.id === 'node-6' && edge.targetHandle === 'm1-input') {
              return { ...node, data: { ...node.data, m1Data: output } };
            } else {
              return { ...node, data: { ...node.data, inputData: output } };
            }
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode4 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-4');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          if (connectedEdges.some(e => e.target === node.id)) {
            return { ...node, data: { ...node.data, inputData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode5 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-5');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          const edge = connectedEdges.find(e => e.target === node.id);
          if (edge && node.id === 'node-6' && edge.targetHandle === 'm3-input') {
            return { ...node, data: { ...node.data, m3Data: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode6 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-6');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          if (connectedEdges.some(e => e.target === node.id)) {
            return { ...node, data: { ...node.data, inputData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteNode7 = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-7');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          const edge = connectedEdges.find(e => e.target === node.id);
          if (edge && node.id === 'node-output' && edge.targetHandle === 'ci-input') {
            return { ...node, data: { ...node.data, ciData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const handleExecuteLLM = useCallback((output) => {
    setEdges(currentEdges => {
      const connectedEdges = currentEdges.filter(e => e.source === 'node-llm');
      if (connectedEdges.length > 0) {
        setNodes(nds => nds.map(node => {
          const edge = connectedEdges.find(e => e.target === node.id);
          if (edge && node.id === 'node-output' && edge.targetHandle === 'llm-input') {
            return { ...node, data: { ...node.data, llmData: output } };
          }
          return node;
        }));
      }
      return currentEdges;
    });
  }, []);

  const [isDeploying, setIsDeploying] = useState(false);
  
  const handleDeployToProduction = async () => {
    setIsDeploying(true);
    try {
      const savedRuleStr = localStorage.getItem('decisionNodeRule_node-router');
      const rule = savedRuleStr ? JSON.parse(savedRuleStr) : null;
      
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/testrig/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ routingRule: rule })
      });
      
      if (res.ok) {
        alert("Pipeline Routing Rules successfully deployed to LIVE Production!");
      } else {
        alert("Failed to deploy rules.");
      }
    } catch (err) {
      alert("Error deploying rules.");
    } finally {
      setIsDeploying(false);
    }
  };

  React.useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.id === 'node-1') return { ...node, data: { ...node.data, onExecute: handleExecuteNode1 } };
      if (node.id === 'node-2') return { ...node, data: { ...node.data, onExecute: handleExecuteNode2 } };
      if (node.id === 'node-router') return { ...node, data: { ...node.data, onExecute: handleExecuteRouter } };
      if (node.id === 'node-3') return { ...node, data: { ...node.data, onExecute: handleExecuteNode3 } };
      if (node.id === 'node-4') return { ...node, data: { ...node.data, onExecute: handleExecuteNode4 } };
      if (node.id === 'node-5') return { ...node, data: { ...node.data, onExecute: handleExecuteNode5 } };
      if (node.id === 'node-6') return { ...node, data: { ...node.data, onExecute: handleExecuteNode6 } };
      if (node.id === 'node-7') return { ...node, data: { ...node.data, onExecute: handleExecuteNode7 } };
      if (node.id === 'node-llm') return { ...node, data: { ...node.data, onExecute: handleExecuteLLM } };
      return node;
    }));
  }, [handleExecuteNode1, handleExecuteNode2, handleExecuteRouter, handleExecuteNode3, handleExecuteNode4, handleExecuteNode5, handleExecuteNode6, handleExecuteNode7, handleExecuteLLM]);


  return (
    <div className="admin-view-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="admin-view-header">
        <h2 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>Workflow Test Rig</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#a1a1aa', margin: '8px 0 0', fontSize: '14px' }}>
            Interactive node-based canvas for testing workflows. Save changes to deploy them to Production.
          </p>
          <button 
            onClick={handleDeployToProduction}
            disabled={isDeploying}
            style={{ 
              background: '#ec4899', color: '#fff', border: 'none', 
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '14px',
              opacity: isDeploying ? 0.7 : 1
            }}
          >
            {isDeploying ? 'Deploying...' : 'Deploy to Production'}
          </button>
        </div>
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
