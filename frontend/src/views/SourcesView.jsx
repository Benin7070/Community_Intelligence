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

        <div className="sources-cards-grid" id="sourcesBreakdownGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Stack Overflow Card */}
          <div className="glass-card source-stat-card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div className="source-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="source-tag so" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>Stack Overflow</span>
              <span className="source-count" id="soCount" style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#ffffff' }}>
                {sourcesSummary['Stack Overflow'] ? `${sourcesSummary['Stack Overflow']} Threads` : '0 Threads'}
              </span>
            </div>
            <p className="source-desc" style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
              Accepted answers, vote counts, gold/silver badge weighting.
            </p>
            <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#64748b', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
              api.stackexchange.com/2.3/search
            </div>
          </div>

          {/* GitHub Issues Card */}
          <div className="glass-card source-stat-card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div className="source-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="source-tag gh" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>GitHub</span>
              <span className="source-count" id="ghCount" style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#ffffff' }}>
                {sourcesSummary['GitHub'] ? `${sourcesSummary['GitHub']} Issues` : '0 Issues'}
              </span>
            </div>
            <p className="source-desc" style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
              Issue benchmarks, repository maintainer discussions, reproduction scripts.
            </p>
            <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#64748b', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
              api.github.com/search/issues
            </div>
          </div>

          {/* HackerNews Card */}
          <div className="glass-card source-stat-card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div className="source-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="source-tag hn" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>HackerNews</span>
              <span className="source-count" id="hnCount" style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#ffffff' }}>
                {sourcesSummary['HackerNews'] ? `${sourcesSummary['HackerNews']} Posts` : '0 Posts'}
              </span>
            </div>
            <p className="source-desc" style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
              Trending community discussions, technical analysis, and developer opinions.
            </p>
            <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#64748b', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
              hn.algolia.com/api/v1/search
            </div>
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
