import React from 'react';

interface Step {
  key: string;
  label: string;
}

interface StepProgressBarProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<string>;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  steps,
  currentStep,
  completedSteps,
}) => {
  return (
    <div className="step-progress-bar">
      {steps.map((step, idx) => {
        const isCompleted = completedSteps.has(step.key);
        const isActive = idx === currentStep;
        const statusClass = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

        return (
          <React.Fragment key={step.key}>
            <div className="step-item">
              <div className={`step-badge ${statusClass}`}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`step-label ${statusClass}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`step-connector ${isCompleted ? 'completed' : isActive ? 'active' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};