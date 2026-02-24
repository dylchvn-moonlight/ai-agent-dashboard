import React, { useState, useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation',
    content: 'Use the sidebar to navigate between Dashboard, Agent Builder, Training, Monitor, Deploy, Resources, and Settings.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-header"]',
    title: 'Your Agents',
    content: 'The Dashboard shows all your AI agents at a glance — their status, recent activity, and quick stats.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="new-agent-btn"]',
    title: 'Create an Agent',
    content: 'Click here to create a new AI agent. You\'ll design its workflow visually in the Agent Builder.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings-nav"]',
    title: 'Configure Settings',
    content: 'Head to Settings to add your API keys, set default model preferences, and manage your data.',
    placement: 'right',
    disableBeacon: true,
  },
];

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

export default function GuidedTour({ run, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleCallback = useCallback((data) => {
    const { status, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish?.();
    }

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  }, [onFinish]);

  return (
    <Joyride
      steps={STEPS}
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
