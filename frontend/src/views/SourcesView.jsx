import React, { useRef, useEffect } from 'react';
import { usePipeline } from '../context/PipelineContext';
import { animatePanelEntrance } from '../utils/motion';

export default function SourcesView() {
  const panelRef = useRef(null);
  const { currentData } = usePipeline();

  useEffect(() => {
    if (panelRef.current) {
      animatePanelEntrance(panelRef.current);
    }
  }, []);

  const sourcesSummary = currentData?.sources_summary || {};
  const posts = currentData?.posts || [];

  return (
    <section className="view-panel active" id="viewSources" ref={panelRef}>
      <div className="sources-view-container">
        <div className="view-top-summary">
          <h3>Heterogeneous Community Data Coverage</h3>
          <p>Real-time telemetry of multi-platform post ingestion and author credibility scoring (Module 3.1 & 3.5).</p>
        </div>

        <div className="sources-cards-grid" id="sourcesBreakdownGrid">
          {/* Stack Overflow Card */}
          <div className="glass-card source-stat-card">
            <div className="source-card-head">
              <span className="source-tag so">Stack Overflow</span>
              <span className="source-count" id="soCount">
                {sourcesSummary['Stack Overflow'] ? `${sourcesSummary['Stack Overflow']} Threads` : '1 Thread'}
              </span>
            </div>
            <p className="source-desc">Accepted answers, vote counts, gold/silver badge weighting (w_v=0.35, w_r=0.25).</p>
          </div>

          {/* GitHub Issues Card */}
          <div className="glass-card source-stat-card">
            <div className="source-card-head">
              <span className="source-tag gh">GitHub</span>
              <span className="source-count" id="ghCount">
                {sourcesSummary['GitHub'] ? `${sourcesSummary['GitHub']} Issues` : '1 Issue'}
              </span>
            </div>
            <p className="source-desc">Issue benchmarks, repository maintainer discussions, reproduction scripts.</p>
          </div>

          {/* Reddit Card */}
          <div className="glass-card source-stat-card">
            <div className="source-card-head">
              <span className="source-tag reddit">Reddit</span>
              <span className="source-count" id="redditCount">
                {sourcesSummary['Reddit'] ? `${sourcesSummary['Reddit']} Posts` : '1 Post'}
              </span>
            </div>
            <p className="source-desc">Real-world deprecation notices, version caveats, MinHash duplicate checked.</p>
          </div>

          {/* Forums & Docs Card */}
          <div className="glass-card source-stat-card">
            <div className="source-card-head">
              <span className="source-tag forums">Dev Forums</span>
              <span className="source-count" id="forumsCount">
                {sourcesSummary['Forums'] ? `${sourcesSummary['Forums']} Posts` : '1 Post'}
              </span>
            </div>
            <p className="source-desc">Containerized and distributed systems edge-cases, memory limit configurations.</p>
          </div>
        </div>

        <div className="glass-card raw-posts-card">
          <h4>Retrieved Community Posts & Author Profiles</h4>
          <div className="posts-list" id="rawPostsList">
            {posts.length === 0 ? (
              <div className="empty-state-text">
                Execute a query to inspect live retrieved posts and author reputation scores.
              </div>
            ) : (
              posts.map((post, idx) => (
                <div className="post-item-box" key={idx}>
                  <div className="post-header-line">
                    <span className="post-author-badge">
                      Author: {post.author?.username || 'developer'} (Rep: {Number(post.author?.reputation || 0).toLocaleString()})
                    </span>
                    <span className="post-score-badge">
                      Upvotes: +{post.score} {post.is_accepted ? '• [ACCEPTED SOLUTION]' : ''}
                    </span>
                  </div>
                  <p className="post-body-text">{post.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
