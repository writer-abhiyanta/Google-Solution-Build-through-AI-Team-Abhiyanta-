import React, { useState, useEffect } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';

export const OnboardingTour = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run once per device using localStorage
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-emerald-400 font-bold text-lg mb-2">Welcome to Neutral-IQ</h3>
          <p>Let us take a quick tour of your new Decision Intelligence Engine. This will guide you through the core synchronous capabilities.</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '.tour-agent-marketplace',
      content: (
        <div>
          <h3 className="text-amber-400 font-bold mb-2">Agent Marketplace</h3>
          <p>Select a specialized cognitive agent whose expertise best fits your problem domain.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '.tour-decision-parameters',
      content: 'Enter the context or problem statement here. The swarm will use this input to simulate a debate among various perspectives.',
      placement: 'left',
    },
    {
      target: '.tour-intuition-slider',
      content: 'Adjust the balance between strict logic and abstract intuition. This tunes the creative latitude given to the analysis.',
      placement: 'top',
    },
    {
      target: '.tour-submit',
      content: 'Click here to synchronize thoughts and trigger the adversarial swarm intelligence.',
      placement: 'bottom',
    },
    {
      target: '.tour-live-session',
      content: 'Collaborating? Generate a secure session link here to invite team members and decide synchronously.',
      placement: 'bottom',
    },
    {
      target: '.tour-history',
      content: 'All your decisions are backed up in the Brain Storage. You can search, filter, and review them at any time.',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      backgroundColor="#0f172a"
      textColor="#f8fafc"
      arrowColor="#0f172a"
      primaryColor="#10b981"
      overlayColor="rgba(0, 0, 0, 0.7)"
      styles={{
        tooltip: {
          borderRadius: '12px',
          border: '1px solid #1e293b'
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#10b981',
          borderRadius: '8px',
          fontWeight: 'bold',
          padding: '8px 16px'
        },
        buttonBack: {
          color: '#94a3b8',
        },
        buttonSkip: {
          color: '#94a3b8',
        }
      }}
    />
  );
};
