import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePipeline } from '../context/PipelineContext';
import { animatePanelEntrance } from '../utils/motion';

export default function ProvenanceView() {
  const { currentData } = usePipeline();
  const canvasRef = useRef(null);
  const panelRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const graphData = currentData?.provenance_graph || null;

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Execute a query from the live console to construct the Claim-Source Provenance Graph.',
        width / 2,
        height / 2
      );
      return;
    }

    const nodes = graphData.nodes;
    const queryNode = nodes.find(n => n.type === 'query') || nodes[0];
    const sourceNodes = nodes.filter(n => n.type === 'source');
    const claimNodes = nodes.filter(n => n.type === 'claim');
    const evidenceNodes = nodes.filter(n => n.type === 'evidence');

    queryNode.x = width * 0.15;
    queryNode.y = height * 0.5;

    sourceNodes.forEach((n, i) => {
      n.x = width * 0.40;
      n.y = height * 0.2 + (i * (height * 0.6) / Math.max(1, sourceNodes.length - 1));
    });

    claimNodes.forEach((n, i) => {
      n.x = width * 0.65;
      n.y = height * 0.2 + (i * (height * 0.6) / Math.max(1, claimNodes.length - 1));
    });

    evidenceNodes.forEach((n, i) => {
      n.x = width * 0.88;
      n.y = height * 0.2 + (i * (height * 0.6) / Math.max(1, evidenceNodes.length - 1));
    });

    ctx.clearRect(0, 0, width, height);

    // Draw Edges
    (graphData.edges || []).forEach(edge => {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = edge.label === 'contradicts' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Edge Label
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label || '', midX, midY - 4);
      }
    });

    // Draw Nodes
    nodes.forEach(node => {
      ctx.beginPath();
      const radius = node.type === 'query' ? 22 : 16;
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

      if (node.type === 'query') ctx.fillStyle = '#ffffff';
      else if (node.type === 'source') ctx.fillStyle = '#a1a1aa';
      else if (node.type === 'claim') ctx.fillStyle = '#d4d4d8';
      else ctx.fillStyle = '#f4f4f5';

      ctx.fill();
      ctx.strokeStyle = selectedNode?.id === node.id ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = selectedNode?.id === node.id ? 3 : 2;
      ctx.stroke();

      // Node Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      const label = node.label || node.id || '';
      ctx.fillText(label.substring(0, 18), node.x, node.y + radius + 14);
    });
  }, [graphData, selectedNode]);

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
  }, []);

  useEffect(() => {
    drawGraph();

    const handleResize = () => {
      drawGraph();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);

  const handleCanvasClick = (e) => {
    if (!graphData || !graphData.nodes) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = graphData.nodes.find(n => {
      if (n.x === undefined || n.y === undefined) return false;
      const dist = Math.hypot(n.x - clickX, n.y - clickY);
      return dist <= 24;
    });

    if (clicked) {
      setSelectedNode(clicked);
    }
  };

  return (
    <section className="view-panel active" id="viewProvenance" ref={panelRef}>
      <div className="provenance-view-container">
        <div className="provenance-toolbar">
          <div className="toolbar-info">
            <h3>Layer 4: Claim-Source Provenance Graph</h3>
            <p>Interactive lineage network connecting User Query, Community Posts, Extracted Claims, and Cross-Referenced Evidence.</p>
          </div>
          <div className="graph-legend">
            <span className="legend-item"><span className="legend-dot cyan"></span> Query</span>
            <span className="legend-item"><span className="legend-dot blue"></span> Stack Overflow</span>
            <span className="legend-item"><span className="legend-dot purple"></span> GitHub</span>
            <span className="legend-item"><span className="legend-dot orange"></span> Reddit / Forums</span>
            <span className="legend-item"><span className="legend-dot green"></span> Validated Evidence</span>
          </div>
        </div>

        <div className="graph-viewport-card glass-card">
          <canvas
            ref={canvasRef}
            id="provenanceCanvas"
            className="provenance-canvas"
            onClick={handleCanvasClick}
          />
          <div className="graph-node-details glass-card" id="graphNodeDetailsPanel">
            <h4>Node Inspector</h4>
            <p className="inspector-hint">Click on any node in the graph to inspect author reputation, credibility weight, and MinHash independence score.</p>
            <div id="inspectorContent">
              {selectedNode ? (
                <div style={{ marginTop: '10px', fontSize: '12px', lineHeight: '1.6' }}>
                  <p><strong>ID:</strong> <code>{selectedNode.id}</code></p>
                  <p><strong>Type:</strong> <span className="badge-tag layer3-tag">{selectedNode.type?.toUpperCase()}</span></p>
                  {selectedNode.platform && <p><strong>Platform:</strong> {selectedNode.platform}</p>}
                  {selectedNode.credibility && <p><strong>Credibility Weight:</strong> {selectedNode.credibility}</p>}
                  <p><strong>Details:</strong></p>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', fontSize: '11px', marginTop: '4px', color: '#a7f3d0' }}>
                    {selectedNode.details || 'Standard node element in knowledge graph.'}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
