import React, { useState, useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { getTourSteps } from '@/lib/tour-steps';

const tooltipStyles = {
  options: {
    arrowColor: 'var(--sf)',
    backgroundColor: 'var(--sf)',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    textColor: 'var(--tx)',
    zIndex: 1000,
  },
  tooltip: {
    borderRadius: '12px',
    border: '1px solid var(--glassBd)',
    backdropFilter: 'blur(20px)',
    padding: '16px 20px',
    maxWidth: '320px',
  },
  tooltipTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--hd)',
    marginBottom: '6px',
  },
  tooltipContent: {
    fontSize: '13px',
    color: 'var(--sb)',
    lineHeight: '1.5',
    padding: 0,
  },
  buttonNext: {
    backgroundColor: 'var(--blue)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '8px 16px',
  },
  buttonBack: {
    color: 'var(--dm)',
    fontSize: '12px',
    marginRight: '8px',
  },
  buttonSkip: {
    color: 'var(--dm)',
    fontSize: '12px',
  },
};

export default function GuidedTour({ viewId, run, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = getTourSteps(viewId);

  const handleCallback = useCallback((data) => {
    const { status, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      onFinish?.();
    }

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  }, [onFinish]);

  // Reset step index when viewId changes
  React.useEffect(() => {
    setStepIndex(0);
  }, [viewId]);

  if (!steps.length) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      styles={tooltipStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
