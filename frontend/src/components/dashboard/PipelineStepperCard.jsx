import React from 'react';

export default function PipelineStepperCard({ stages, timerText }) {
  return (
    <div className="glass-card pipeline-card">
      <div className="card-header">
        <div className="header-icon-box emerald">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="card-title">3. Community Intelligence Core</h3>
          <span className="card-subtitle">Real-Time Stage Telemetry (safe_docs/components_definition.png)</span>
        </div>
        <div className="stepper-time" id="pipelineTimer">
          {timerText}
        </div>
      </div>

      <div className="pipeline-stepper-list" id="stepperContainer">
        {stages.map((stage, idx) => {
          const isActive = stage.status === 'active';
          const isCompleted = stage.status === 'completed';

          let statusText = 'Standby';
          if (isActive) statusText = 'Processing...';
          else if (isCompleted) statusText = 'Completed';

          return (
            <div
              key={stage.id}
              className={`stepper-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              id={`step-card-${idx + 1}`}
            >
              <div className="step-header">
                <div className="step-num-badge">{idx + 1}</div>
                <div className="step-title-group">
                  <h4>{stage.name}</h4>
                  <span className="step-status-text">{statusText}</span>
                </div>
              </div>

              {(isActive || isCompleted) && stage.details && (
                <div className="step-details-tray">
                  {`[${isActive ? 'EXECUTING' : 'VALIDATED'}]\n${JSON.stringify(stage.details, null, 2)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
