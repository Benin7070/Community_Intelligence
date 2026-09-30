import React, { useRef, useEffect } from 'react';
import { animatePanelEntrance } from '../utils/motion';

export default function ArchitectureView() {
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
  }, []);

  return (
    <section className="view-panel active" id="viewArchitecture" ref={panelRef}>
      <div className="architecture-view-container">
        <div className="blueprint-header">
          <h2>Community Intelligence System Architecture</h2>
          <p>Interactive technical reference mirroring <code>safe_docs/fyp_architecture_updated.png</code> and <code>only_for_tech.xml</code>.</p>
        </div>

        <div className="blueprint-layers-grid">
          {/* Layer 1 */}
          <div className="blueprint-layer layer-ui-box">
            <div className="layer-header">
              <span className="layer-num">1</span>
              <h3>USER INTERFACE LAYER</h3>
            </div>
            <div className="layer-nodes-row">
              <div className="bp-node"><strong>User Query</strong><span>Natural Language</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Web / API Interface</strong><span>Chat • Search • API</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Final Response</strong><span>Evidence • Confidence • Citations</span></div>
            </div>
          </div>

          {/* Layer 2 */}
          <div className="blueprint-layer layer-router-box">
            <div className="layer-header">
              <span className="layer-num">2</span>
              <h3>QUERY UNDERSTANDING & ROUTING</h3>
            </div>
            <div className="layer-nodes-row">
              <div className="bp-node"><strong>Conversation Context</strong><span>Reference Resolution</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Query Analysis</strong><span>Intent • Domain • Query Type</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node highlight-purple"><strong>Community Intelligence Router</strong><span>Is Community Evidence Useful?</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>General RAG / Web Search</strong><span>General Technical Docs</span></div>
            </div>
          </div>

          {/* Layer 3 */}
          <div className="blueprint-layer layer-core-box">
            <div className="layer-header">
              <span className="layer-num">3</span>
              <h3>COMMUNITY INTELLIGENCE CORE (Modules 3.1 - 3.7)</h3>
            </div>
            <div className="core-modules-grid">
              <div className="bp-module-card">
                <h4>3.1 Community Data Acquisition</h4>
                <p>Collect heterogeneous community posts</p>
                <div className="tech-tags"><span>Reddit</span><span>GitHub</span><span>Stack Overflow</span><span>Forums</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.2 Claim & Context Modeling</h4>
                <p>Convert posts into structured contextual claims</p>
                <div className="tech-tags"><span>Claim Extraction</span><span>Decomposition</span><span>Version/Env Context</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.3 Evidence Assessment</h4>
                <p>Determine how evidence relates to claims</p>
                <div className="tech-tags"><span>Supports</span><span>Contradicts</span><span>Qualifies</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.4 Provenance & Independence</h4>
                <p>Determine whether evidence is genuinely independent</p>
                <div className="tech-tags"><span>MinHash</span><span>SimHash</span><span>Lineage Chains</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.5 Reliability & Signals</h4>
                <p>Multi-signal weights: Eq 1 S_cred(a, u)</p>
                <div className="tech-tags"><span>Votes</span><span>Reputation</span><span>Badges</span><span>Recency Decay</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.6 Collective Support & Conflict</h4>
                <p>Infer support across competing claims</p>
                <div className="tech-tags"><span>Truth Discovery</span><span>Conflict Matrix</span><span>Consensus Rate</span></div>
              </div>
              <div className="bp-module-card">
                <h4>3.7 Uncertainty & Abstention</h4>
                <p>Prevent weak evidence from becoming false certainty</p>
                <div className="tech-tags"><span>Bayesian Calibration</span><span>Epistemic/Aleatoric</span><span>Abstain Guard</span></div>
              </div>
            </div>
          </div>

          {/* Layer 4 */}
          <div className="blueprint-layer layer-data-box">
            <div className="layer-header">
              <span className="layer-num">4</span>
              <h3>DATA & KNOWLEDGE LAYER</h3>
            </div>
            <div className="layer-nodes-row">
              <div className="bp-node"><strong>Raw Data Store</strong><span>Community posts • API temp cache</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Retrieved Content</strong><span>Claims • Metadata • Relationships</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node highlight-amber"><strong>Claim-Source Provenance Graph</strong><span>Neo4j Graph Model</span></div>
            </div>
          </div>

          {/* Layer 5 */}
          <div className="blueprint-layer layer-llm-box">
            <div className="layer-header">
              <span className="layer-num">5</span>
              <h3>LLM SYNTHESIS & RESPONSE</h3>
            </div>
            <div className="layer-nodes-row">
              <div className="bp-node"><strong>Evidence-Grounded Generation</strong><span>Structured claims • evidence • conflicts</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Answer Formatter</strong><span>Citations • Key claims • Caveats</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node highlight-pink"><strong>Final Evidence Answer</strong><span>Supported claims & Confidence</span></div>
            </div>
          </div>

          {/* Layer 6 */}
          <div className="blueprint-layer layer-feedback-box">
            <div className="layer-header">
              <span className="layer-num">6</span>
              <h3>HUMAN / COMMUNITY FEEDBACK LOOP (Continuous Improvement)</h3>
            </div>
            <div className="layer-nodes-row">
              <div className="bp-node"><strong>User Feedback</strong><span>Helpful • Contradiction • Missing evidence</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Feedback Store</strong><span>PostgreSQL / Analytics Store</span></div>
              <div className="bp-arrow">➔</div>
              <div className="bp-node"><strong>Model Improvement</strong><span>Calibration • Re-ranking • Evaluation</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
