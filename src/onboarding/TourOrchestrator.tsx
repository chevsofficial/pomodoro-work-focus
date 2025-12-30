import React, { useEffect } from 'react';
import { initializeTourState, navigateToStage } from './tourController';

export const TourOrchestrator: React.FC = () => {
  useEffect(() => {
    const run = async () => {
      const state = await initializeTourState();
      if (!state.completed && state.stage) {
        navigateToStage(state.stage);
      }
    };

    run();
  }, []);

  return null;
};
