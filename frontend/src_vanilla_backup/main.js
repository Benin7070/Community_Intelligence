import './style.css';
import { initMotion, animateViewSwitch, startAnalysePulse, stopAnalysePulse } from './motion.js';

const API_BASE = 'http://localhost:8000/api/v1';
const WS_BASE = 'ws://localhost:8000/ws/pipeline';

// State Management
let currentData = null;
let ws = null;
let pipelineStartTime = null;
let timerInterval = null;

// DOM Elements
const navBtns = document.querySelectorAll('.nav-btn');
const viewPanels = document.querySelectorAll('.view-panel');
const currentViewTitle = document.getElementById('currentViewTitle');
const currentViewSubtitle = document.getElementById('currentViewSubtitle');
const queryTextarea = document.getElementById('queryTextarea');
const submitQueryBtn = document.getElementById('submitQueryBtn');
const stepperContainer = document.getElementById('stepperContainer');
const pipelineTimer = document.getElementById('pipelineTimer');
const routerDetailsBody = document.getElementById('routerDetailsBody');
const routerStatusPill = document.getElementById('routerStatusPill');
const synthesisContent = document.getElementById('synthesisContent');
const confidenceGaugeBadge = document.getElementById('confidenceGaugeBadge');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const presetChips = document.querySelectorAll('.preset-chip');

// Feedback Buttons (Layer 6)
const fbHelpful = document.getElementById('fbHelpful');
const fbIncorrect = document.getElementById('fbIncorrect');
const fbMissing = document.getElementById('fbMissing');

// View Definitions
const VIEW_METADATA = {
  dashboard: {
    title: 'Live Intelligence Console',
    subtitle: 'Multi-source developer knowledge synthesis with probabilistic consensus modeling'
  },
  provenance: {
    title: 'Claim-Source Provenance Graph (Layer 4)',
    subtitle: 'Traceable lineage network linking queries, source posts, extracted claims, and evidence'
  },
  architecture: {
    title: 'System Blueprint & 6-Layer Architecture',
    subtitle: 'Interactive technical specification mirroring safe_docs/fyp_architecture_updated.png'
  },
  conflicts: {
    title: 'Conflict & Bayesian Uncertainty Matrix',
    subtitle: 'Mathematical quantification of consensus agreement, contradictory claims, and abstention guards'
  },
  sources: {
    title: 'Heterogeneous Community Data Coverage',
    subtitle: 'Real-time telemetry of multi-platform post ingestion and author credibility scoring (Eq 1)'
  },
  admin: {
    title: 'Admin Governance & User Delegation',
    subtitle: 'Manage system roles, oversee platform access policies, and audit community research permissions'
  },
  'admin-audit': {
    title: 'System Audit Logs',
    subtitle: 'Monitor user actions, system modifications, and access events'
  }
};

// Core Pipeline Stages definition
const CORE_STAGES = [
  { id: 'm1', name: '3.1 Community Data Acquisition', desc: 'Ingest from Stack Overflow, GitHub, Reddit, & Forums' },
  { id: 'm2', name: '3.2 Claim & Context Modeling', desc: 'Decompose posts into contextual claims (version/env)' },
  { id: 'm3', name: '3.3 Evidence Assessment', desc: 'Classify relationships (supports, contradicts, qualifies)' },
  { id: 'm4', name: '3.4 Provenance & Independence', desc: 'MinHash/SimHash duplicate & derived content penalty' },
  { id: 'm5', name: '3.5 Reliability & Community Signals', desc: 'Compute Eq 1 Multi-signal credibility weight S_cred' },
  { id: 'm6', name: '3.6 Collective Support & Conflict', desc: 'Truth-discovery consensus clustering & conflict matrix' },
  { id: 'm7', name: '3.7 Uncertainty & Abstention', desc: 'Bayesian sigmoidal calibration & abstention safety guard' }
];

// Initialize Navigation View Switcher
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn'); // Re-select if DOM changed
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetNavGroup = btn.getAttribute('data-navgroup');
      if (targetNavGroup) {
        document.getElementById('mainNavGroup').style.display = targetNavGroup === 'main' ? 'block' : 'none';
        document.getElementById('adminNavGroup').style.display = targetNavGroup === 'admin' ? 'block' : 'none';
        
        // Auto-click the appropriate default view for the group
        if (targetNavGroup === 'admin') {
          const overviewBtn = document.getElementById('navAdminOverview');
          if (overviewBtn) overviewBtn.click();
        } else if (targetNavGroup === 'main') {
          const dashBtn = document.getElementById('navDashboard');
          if (dashBtn) dashBtn.click();
        }
        return; // Stop here, the click() will handle the view switch
      }

      const targetView = btn.getAttribute('data-view');
      if (!targetView) return;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewPanels.forEach(panel => panel.classList.remove('active'));
      const activePanel = document.getElementById(`view${capitalize(targetView.split('-')[0])}${targetView.includes('-') ? '-' + targetView.split('-')[1] : ''}`);
      if (activePanel) {
        activePanel.classList.add('active');
        animateViewSwitch(activePanel);
      } else {
        // Fallback for compound views like admin-audit -> viewAdmin-audit
        const exactPanel = document.getElementById(`view${capitalize(targetView)}`);
        if (exactPanel) {
          exactPanel.classList.add('active');
          animateViewSwitch(exactPanel);
        }
      }

      if (VIEW_METADATA[targetView]) {
        currentViewTitle.textContent = VIEW_METADATA[targetView].title;
        currentViewSubtitle.textContent = VIEW_METADATA[targetView].subtitle;
      }

      if (targetView === 'provenance' && currentData) {
        renderProvenanceGraph(currentData.provenance_graph);
      }

      if (targetView === 'admin' || targetView === 'admin-audit') {
        loadAdminDashboard();
      }
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Preset Quick Chips
function initPresets() {
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      queryTextarea.value = query;
      executePipeline(query);
    });
  });
}

// WebSocket Connection Management
function initWebSocket() {
  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    connectionDot.className = 'status-dot pulse';
    connectionText.textContent = 'WebSocket Connected';
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketEvent(data);
    } catch (err) {
      console.error('WS JSON parse error:', err);
    }
  };

  ws.onclose = () => {
    connectionDot.className = 'status-dot';
    connectionDot.style.background = '#ef4444';
    connectionText.textContent = 'Reconnecting...';
    setTimeout(initWebSocket, 2000);
  };
}

// Render Initial Stepper UI
function renderInitialStepper() {
  stepperContainer.innerHTML = '';
  CORE_STAGES.forEach((stage, idx) => {
    const card = document.createElement('div');
    card.className = 'stepper-card';
    card.id = `step-card-${idx + 1}`;
    card.innerHTML = `
      <div class="step-header">
        <div class="step-num-badge">${idx + 1}</div>
        <div class="step-title-group">
          <h4>${stage.name}</h4>
          <span class="step-status-text">Standby</span>
        </div>
      </div>
      <div class="step-details-tray" style="display: none;"></div>
    `;
    stepperContainer.appendChild(card);
  });
}

// WebSocket Live Event Processing
function handleWebSocketEvent(data) {
  const { module, status, details } = data;

  // Handle Layer 2 Routing
  if (module.includes('2.0 Query Understanding')) {
    if (status === 'started') {
      routerStatusPill.className = 'status-pill status-active';
      routerStatusPill.textContent = 'Analyzing...';
      routerDetailsBody.innerHTML = `<div class="empty-state-text">Classifying semantic intent, detecting entity contexts, and evaluating CI necessity...</div>`;
    } else if (status === 'completed' && details) {
      routerStatusPill.className = 'status-pill status-active';
      routerStatusPill.textContent = 'Routed: CI Pipeline';
      routerDetailsBody.innerHTML = `
        <div class="router-grid-tags">
          <div class="router-tag-box"><small>Intent</small><strong>${details.intent || 'empirical_analysis'}</strong></div>
          <div class="router-tag-box"><small>Domain</small><strong>${details.domain || 'Software Runtimes'}</strong></div>
          <div class="router-tag-box"><small>Entities</small><strong>${(details.entities || []).join(', ') || 'Standard'}</strong></div>
          <div class="router-tag-box"><small>Confidence</small><strong style="color: var(--layer3-emerald);">${details.confidence || '96%'}</strong></div>
        </div>
      `;
    }
    return;
  }

  // Handle Layer 3 Core Modules (3.1 to 3.7)
  const stageMatch = CORE_STAGES.findIndex(s => module.startsWith(s.name.substring(0, 3)));
  if (stageMatch !== -1) {
    const stepEl = document.getElementById(`step-card-${stageMatch + 1}`);
    if (stepEl) {
      const statusText = stepEl.querySelector('.step-status-text');
      const tray = stepEl.querySelector('.step-details-tray');

      if (status === 'started') {
        stepEl.classList.add('active');
        stepEl.classList.remove('completed');
        statusText.textContent = 'Processing...';
        tray.style.display = 'block';
        tray.textContent = `[EXECUTING] ${JSON.stringify(details, null, 2)}`;
      } else if (status === 'completed') {
        stepEl.classList.remove('active');
        stepEl.classList.add('completed');
        statusText.textContent = 'Completed';
        tray.style.display = 'block';
        tray.textContent = `[VALIDATED]\n${JSON.stringify(details, null, 2)}`;
      }
    }
    return;
  }

  // System Completion
  if (module === 'System' && status === 'completed') {
    clearInterval(timerInterval);
    pipelineTimer.textContent = 'Completed';
  }
}

// Main Pipeline Execution
async function executePipeline(query) {
  if (!query || !query.trim()) return;

  // Reset UI & Start Timer
  submitQueryBtn.disabled = true;
  submitQueryBtn.style.opacity = '0.7';
  renderInitialStepper();

  routerStatusPill.className = 'status-pill status-active';
  routerStatusPill.textContent = 'Analyzing...';
  confidenceGaugeBadge.textContent = 'Evaluating...';
  confidenceGaugeBadge.className = 'confidence-badge';

  synthesisContent.innerHTML = `
    <div class="synthesis-placeholder">
      <div class="placeholder-icon" style="animation: spin 1.5s linear infinite;">
        <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
      </div>
      <p>Executing 6-Layer Community Intelligence Pipeline...</p>
      <small>Collecting heterogeneous posts, decomposing contextual claims, and inferring consensus weight.</small>
    </div>
  `;

  pipelineStartTime = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - pipelineStartTime) / 1000).toFixed(1);
    pipelineTimer.textContent = `${elapsed}s`;
  }, 100);

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: query.trim() })
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const data = await response.json();
    currentData = data;

    renderSynthesis(data);
    updateConflictsView(data);
    updateSourcesView(data);
    renderProvenanceGraph(data.provenance_graph);

  } catch (error) {
    synthesisContent.innerHTML = `
      <div class="synthesis-placeholder" style="color: #ef4444;">
        <p>Execution Error</p>
        <small>${error.message}</small>
      </div>
    `;
    clearInterval(timerInterval);
    pipelineTimer.textContent = 'Error';
  } finally {
    submitQueryBtn.disabled = false;
    submitQueryBtn.style.opacity = '1';
  }
}

// Render Layer 5 Synthesis Answer
function renderSynthesis(data) {
  const primaryCluster = (data.consensus_clusters && data.consensus_clusters[0]) || null;
  const confidence = primaryCluster ? primaryCluster.confidence_score : 0.88;
  const status = primaryCluster ? primaryCluster.status : 'supported';

  confidenceGaugeBadge.textContent = `Confidence: ${(confidence * 100).toFixed(0)}% (${status.toUpperCase()})`;
  if (confidence >= 0.75) {
    confidenceGaugeBadge.className = 'confidence-badge high';
  }

  synthesisContent.innerHTML = `
    <div class="synthesis-rendered">
      <div class="headline-box">
        <strong>Community Consensus:</strong> ${data.headline_answer}
      </div>

      <div class="synthesis-section">
        <h4>Synthesized Evidence & Supported Claims</h4>
        <div class="claims-pill-list">
          ${(primaryCluster ? primaryCluster.claims : []).map(c => `
            <div class="claim-pill-item">
              <strong>[${c.platform}]</strong> ${c.text}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="caveats-box">
        <strong style="color: var(--layer4-amber); font-size: 13px;">Platform Caveats & Version Warnings:</strong>
        <ul>
          ${(data.caveats || []).map(caveat => `<li>${caveat}</li>`).join('')}
        </ul>
      </div>

      <div class="synthesis-section">
        <h4>Bayesian Calibration Explanation</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${data.confidence_explanation}</p>
      </div>
    </div>
  `;
}

// Render Conflict & Uncertainty View
function updateConflictsView(data) {
  const conflictSummary = data.conflict_summary || {};
  const primaryCluster = (data.consensus_clusters && data.consensus_clusters[0]) || null;
  const uncertainty = (primaryCluster && primaryCluster.uncertainty) || {};

  const consensusGauge = document.getElementById('consensusGauge');
  if (consensusGauge) {
    const rate = Math.round((conflictSummary.consensus_rate || 0.88) * 100);
    consensusGauge.textContent = `${rate}%`;
  }

  const epistemicVal = document.getElementById('epistemicVal');
  const epistemicBar = document.getElementById('epistemicBar');
  if (epistemicVal && epistemicBar) {
    const ep = uncertainty.epistemic_uncertainty || 0.12;
    epistemicVal.textContent = ep.toFixed(3);
    epistemicBar.style.width = `${Math.min(100, ep * 100)}%`;
  }

  const aleatoricVal = document.getElementById('aleatoricVal');
  const aleatoricBar = document.getElementById('aleatoricBar');
  if (aleatoricVal && aleatoricBar) {
    const al = uncertainty.aleatoric_uncertainty || 0.08;
    aleatoricVal.textContent = al.toFixed(3);
    aleatoricBar.style.width = `${Math.min(100, al * 100)}%`;
  }

  // Populate Table
  const tableBody = document.getElementById('conflictTableBody');
  if (tableBody && primaryCluster) {
    tableBody.innerHTML = primaryCluster.evidence.map(ev => {
      const claim = primaryCluster.claims.find(c => c.claim_id === ev.claim_id) || {};
      const relColor = ev.relationship === 'supports' ? 'var(--layer3-emerald)' : (ev.relationship === 'qualifies' ? 'var(--layer4-amber)' : '#ef4444');
      return `
        <tr>
          <td>${claim.text || ev.claim_id}</td>
          <td><span class="source-tag">${ev.platform}</span></td>
          <td><strong style="color: ${relColor}; text-transform: uppercase;">${ev.relationship}</strong></td>
          <td><code>${(ev.credibility_weight || 1.0).toFixed(3)}</code></td>
          <td><code>${(ev.independence_score || 1.0).toFixed(2)}</code></td>
          <td style="color: var(--text-muted);">${conflictSummary.resolution_strategy || 'Contextual Qualification'}</td>
        </tr>
      `;
    }).join('');
  }
}

// Render Data Sources View
function updateSourcesView(data) {
  const sourcesSummary = data.sources_summary || {};
  const soCount = document.getElementById('soCount');
  const ghCount = document.getElementById('ghCount');
  const redditCount = document.getElementById('redditCount');
  const forumsCount = document.getElementById('forumsCount');

  if (soCount) soCount.textContent = `${sourcesSummary['Stack Overflow'] || 1} Thread`;
  if (ghCount) ghCount.textContent = `${sourcesSummary['GitHub'] || 1} Issue`;
  if (redditCount) redditCount.textContent = `${sourcesSummary['Reddit'] || 1} Post`;
  if (forumsCount) forumsCount.textContent = `${sourcesSummary['Forums'] || 1} Post`;

  const rawPostsList = document.getElementById('rawPostsList');
  if (rawPostsList && data.posts) {
    rawPostsList.innerHTML = data.posts.map(post => `
      <div class="post-item-box">
        <div class="post-header-line">
          <span class="post-author-badge">Author: ${post.author.username} (Rep: ${post.author.reputation.toLocaleString()})</span>
          <span class="post-score-badge">Upvotes: +${post.score} ${post.is_accepted ? '• [ACCEPTED SOLUTION]' : ''}</span>
        </div>
        <p class="post-body-text">${post.body}</p>
      </div>
    `).join('');
  }
}

// Interactive Provenance Graph (Canvas-based)
function renderProvenanceGraph(graphData) {
  const canvas = document.getElementById('provenanceCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Execute a query from the console to construct the Claim-Source Provenance Graph.', width / 2, height / 2);
    return;
  }

  // Position Nodes in Radial / Layered layout
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
  graphData.edges.forEach(edge => {
    const src = nodes.find(n => n.id === edge.source);
    const tgt = nodes.find(n => n.id === edge.target);
    if (src && tgt) {
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = edge.label === 'contradicts' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Edge Label
      const midX = (src.x + tgt.x) / 2;
      const midY = (src.y + tgt.y) / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, midX, midY - 4);
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Node Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(node.label.substring(0, 18), node.x, node.y + radius + 14);
  });

  // Attach Click Handler for Node Inspector
  canvas.onclick = (e) => {
    const clickX = e.offsetX;
    const clickY = e.offsetY;
    const clickedNode = nodes.find(n => {
      const dist = Math.hypot(n.x - clickX, n.y - clickY);
      return dist <= 24;
    });

    const inspectorContent = document.getElementById('inspectorContent');
    if (clickedNode && inspectorContent) {
      inspectorContent.innerHTML = `
        <div style="margin-top: 10px; font-size: 12px; line-height: 1.6;">
          <p><strong>ID:</strong> <code>${clickedNode.id}</code></p>
          <p><strong>Type:</strong> <span class="badge-tag layer3-tag">${clickedNode.type.toUpperCase()}</span></p>
          ${clickedNode.platform ? `<p><strong>Platform:</strong> ${clickedNode.platform}</p>` : ''}
          ${clickedNode.credibility ? `<p><strong>Credibility Weight:</strong> ${clickedNode.credibility}</p>` : ''}
          <p><strong>Details:</strong></p>
          <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; font-size: 11px; margin-top: 4px; color: #a7f3d0;">
            ${clickedNode.details || 'Standard node element in knowledge graph.'}
          </div>
        </div>
      `;
    }
  };
}

// Layer 6: Human Feedback Handler
async function handleFeedback(feedbackType, buttonEl) {
  if (!currentData) return;

  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: currentData.query,
        feedback_type: feedbackType,
        comment: `User marked synthesis as ${feedbackType}`
      })
    });

    if (res.ok) {
      [fbHelpful, fbIncorrect, fbMissing].forEach(b => b.classList.remove('voted'));
      buttonEl.classList.add('voted');
      const originalText = buttonEl.querySelector('span').textContent;
      buttonEl.querySelector('span').textContent = 'Recorded ✓';
      setTimeout(() => {
        buttonEl.querySelector('span').textContent = originalText;
      }, 3000);
    }
  } catch (err) {
    console.error('Feedback submit failed:', err);
  }
}

// Event Listeners
submitQueryBtn.addEventListener('click', () => {
  executePipeline(queryTextarea.value);
});

queryTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    executePipeline(queryTextarea.value);
  }
});

fbHelpful.addEventListener('click', () => handleFeedback('helpful', fbHelpful));
fbIncorrect.addEventListener('click', () => handleFeedback('incorrect', fbIncorrect));
fbMissing.addEventListener('click', () => handleFeedback('missing_evidence', fbMissing));

// Window Resize Redraw for Canvas
window.addEventListener('resize', () => {
  if (currentData && currentData.provenance_graph) {
    renderProvenanceGraph(currentData.provenance_graph);
  }
});

// ============================================================================
// ADMIN GOVERNANCE & USER MANAGEMENT MODULE
// Real-time Supabase PostgreSQL user telemetry & RBAC delegation
// ============================================================================

let adminUsersList = [];
let adminSearchTerm = '';
let adminRoleFilter = 'all';

// Toast Notification
function showAdminToast(message, isError = false) {
  const toast = document.getElementById('adminToast');
  const toastMsg = document.getElementById('adminToastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.className = `admin-toast ${isError ? 'error' : 'success'}`;
  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// Security Audit Log entry
function addAuditLog(description) {
  const stream = document.getElementById('adminAuditLogStream');
  if (!stream) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'audit-entry';
  entry.innerHTML = `
    <span class="audit-time">${time}</span>
    <span class="audit-desc">${description}</span>
  `;
  stream.prepend(entry);
}

// Fetch all users from backend API
async function loadAdminDashboard() {
  const refreshBtn = document.getElementById('adminRefreshUsersBtn');
  const tbody = document.getElementById('adminUsersTableBody');
  if (refreshBtn) refreshBtn.classList.add('spinning');

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 403) {
        showAdminToast('Administrative privileges required to access user directory.', true);
        return;
      }
      throw new Error('Failed to retrieve user directory.');
    }

    adminUsersList = await res.json();
    updateAdminKpis();
    renderAdminUsersTable();

  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty" style="color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('spinning');
  }
}

// Update KPI Stats Cards & Counts
function updateAdminKpis() {
  const totalCountEl = document.getElementById('adminTotalUsersCount');
  const adminsCountEl = document.getElementById('adminTotalAdminsCount');
  const normalCountEl = document.getElementById('adminTotalNormalCount');
  const countAll = document.getElementById('filterCountAll');
  const countAdmin = document.getElementById('filterCountAdmin');
  const countNormal = document.getElementById('filterCountNormal');

  const total = adminUsersList.length;
  const admins = adminUsersList.filter(u => u.role === 'admin').length;
  const normals = adminUsersList.filter(u => u.role === 'normal').length;

  if (totalCountEl) totalCountEl.textContent = total;
  if (adminsCountEl) adminsCountEl.textContent = admins;
  if (normalCountEl) normalCountEl.textContent = normals;

  if (countAll) countAll.textContent = total;
  if (countAdmin) countAdmin.textContent = admins;
  if (countNormal) countNormal.textContent = normals;
}

// Render dynamic user table rows
function renderAdminUsersTable() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const currentSavedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const myEmail = currentSavedUser.email || '';

  // Filter
  const filtered = adminUsersList.filter(u => {
    const matchesFilter = (adminRoleFilter === 'all') || (u.role === adminRoleFilter);
    const matchesSearch = !adminSearchTerm || u.email.toLowerCase().includes(adminSearchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No accounts match the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isMe = (u.email === myEmail);
    const isAdmin = (u.role === 'admin');
    const initials = (u.email.substring(0, 2) || 'US').toUpperCase();
    const avatarBg = isAdmin ? '#ffffff' : 'rgba(255, 255, 255, 0.12)';
    const avatarColor = isAdmin ? '#000000' : '#ffffff';
    const avatarBorder = isAdmin ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)';

    return `
      <tr class="admin-user-row">
        <td>
          <div class="user-identity-cell">
            <div class="user-avatar-mini" style="background: ${avatarBg}; color: ${avatarColor}; border: ${avatarBorder}; font-weight: 700;">
              ${initials}
            </div>
            <div class="user-email-col">
              <span class="user-email-text">${u.email}</span>
              <div class="user-meta-tags">
                <span class="user-id-tag">#USR-${u.id}</span>
                ${isMe ? '<span class="you-badge">Active Session</span>' : ''}
              </div>
            </div>
          </div>
        </td>
        <td>
          ${isAdmin 
            ? `<span class="role-pill admin"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin</span>`
            : `<span class="role-pill normal"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> Standard</span>`
          }
        </td>
        <td>
          <span class="scope-text">${isAdmin ? 'Full Governance & Ingestion' : 'Query & Provenance Lineage'}</span>
        </td>
        <td>
          <span class="status-indicator-tag online">
            <span class="pulse-tiny"></span>
            ${u.has_password ? 'Password & OTP' : 'OTP Verified'}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group">
            ${isMe 
              ? `<span class="protected-pill" title="Cannot demote or delete your active session">Protected (You)</span>` 
              : `
                <button class="role-toggle-btn ${isAdmin ? 'demote' : 'promote'}" data-userid="${u.id}" data-currentrole="${u.role}" title="${isAdmin ? 'Demote to Standard' : 'Promote to Admin'}">
                  ${isAdmin ? 'Demote to Standard' : 'Promote to Admin'}
                </button>
                <button class="user-delete-btn" data-userid="${u.id}" title="Delete Account">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              `
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event handlers to role toggles and delete buttons
  tbody.querySelectorAll('.role-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-userid');
      const currentRole = btn.getAttribute('data-currentrole');
      const newRole = (currentRole === 'admin') ? 'normal' : 'admin';
      btn.disabled = true;
      btn.textContent = 'Updating...';
      await updateRole(userId, newRole);
    });
  });

  tbody.querySelectorAll('.user-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-userid');
      if (confirm(`Are you sure you want to remove account #USR-${userId}?`)) {
        await deleteUser(userId);
      }
    });
  });
}

// Update User Role via API
async function updateRole(userId, newRole) {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update role.');
    }

    const updated = await res.json();
    const idx = adminUsersList.findIndex(u => u.id === parseInt(userId, 10));
    if (idx !== -1) {
      adminUsersList[idx].role = updated.role;
    }

    updateAdminKpis();
    renderAdminUsersTable();
    showAdminToast(`Account #${userId} updated to ${newRole.toUpperCase()}`);
    addAuditLog(`User #${userId} role changed to ${newRole.toUpperCase()}`);

  } catch (err) {
    showAdminToast(err.message, true);
    renderAdminUsersTable();
  }
}

// Delete User via API
async function deleteUser(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete user.');
    }

    adminUsersList = adminUsersList.filter(u => u.id !== parseInt(userId, 10));
    updateAdminKpis();
    renderAdminUsersTable();
    showAdminToast(`Account #${userId} removed successfully`);
    addAuditLog(`Account #${userId} removed from directory`);

  } catch (err) {
    showAdminToast(err.message, true);
  }
}

// Initialize Admin Dashboard UI Listeners
function initAdminDashboard() {
  const searchInput = document.getElementById('adminUserSearchInput');
  const refreshBtn = document.getElementById('adminRefreshUsersBtn');
  const filterPills = document.querySelectorAll('.admin-filter-pill');
  const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');
  const closeAddUserModalBtn = document.getElementById('closeAddUserModalBtn');
  const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');
  const addUserModal = document.getElementById('addUserModal');
  const addUserForm = document.getElementById('addUserForm');
  const newAdminUserEmail = document.getElementById('newAdminUserEmail');
  const newAdminUserRole = document.getElementById('newAdminUserRole');
  const addUserModalError = document.getElementById('addUserModalError');
  const addUserModalErrorMsg = document.getElementById('addUserModalErrorMsg');

  // Search input filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      adminSearchTerm = e.target.value.trim();
      renderAdminUsersTable();
    });
  }

  // Filter pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      adminRoleFilter = pill.getAttribute('data-filter');
      renderAdminUsersTable();
    });
  });

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAdminDashboard();
      showAdminToast('Refreshing directory...');
    });
  }

  // Modal open/close
  if (openAddUserModalBtn && addUserModal) {
    openAddUserModalBtn.addEventListener('click', () => {
      addUserModal.style.display = 'flex';
      if (newAdminUserEmail) {
        newAdminUserEmail.value = '';
        newAdminUserEmail.focus();
      }
      if (addUserModalError) addUserModalError.style.display = 'none';
    });
  }

  const closeModal = () => {
    if (addUserModal) addUserModal.style.display = 'none';
  };

  if (closeAddUserModalBtn) closeAddUserModalBtn.addEventListener('click', closeModal);
  if (cancelAddUserBtn) cancelAddUserBtn.addEventListener('click', closeModal);

  // Provision form submit
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (newAdminUserEmail.value || '').trim();
      const role = newAdminUserRole.value;

      if (!email) return;

      const submitBtn = document.getElementById('submitAddUserBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
      }

      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/auth/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, role })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Could not provision account.');
        }

        const newUser = await res.json();
        adminUsersList.unshift(newUser);
        updateAdminKpis();
        renderAdminUsersTable();
        closeModal();
        showAdminToast(`Account provisioned for ${email}`);
        addAuditLog(`Account provisioned for ${email} (${role.toUpperCase()})`);

      } catch (err) {
        if (addUserModalError && addUserModalErrorMsg) {
          addUserModalErrorMsg.textContent = err.message;
          addUserModalError.style.display = 'flex';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Provision Account';
        }
      }
    });
  }

  // Listen to external auth events
  window.addEventListener('auth:user_changed', (e) => {
    const user = e.detail;
    if (user && user.role === 'admin') {
      loadAdminDashboard();
    }
  });
}

// App Initialization
initNavigation();
initPresets();
initWebSocket();
renderInitialStepper();
initAdminDashboard();
initMotion();


