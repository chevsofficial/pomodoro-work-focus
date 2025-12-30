import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { resetTo } from '../navigation/navigationRef';

export type TourStage = 'pomodoro' | 'activityTypes' | 'tasks' | 'analytics' | 'paywall';

export type TourState = {
  completed: boolean;
  stage: TourStage | null;
};

const TOUR_COMPLETED_KEY = 'onboarding.tourCompleted';
const TOUR_STAGE_KEY = 'onboarding.stage';

const STAGE_ORDER: TourStage[] = [
  'pomodoro',
  'activityTypes',
  'tasks',
  'analytics',
  'paywall',
];

let cachedState: TourState | null = null;
const listeners = new Set<(state: TourState) => void>();

const isValidStage = (value: string | null): value is TourStage =>
  !!value && STAGE_ORDER.includes(value as TourStage);

const notify = (state: TourState) => {
  listeners.forEach((listener) => listener(state));
};

const updateCachedState = (state: TourState) => {
  cachedState = state;
  notify(state);
};

export const subscribeTourState = (listener: (state: TourState) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTourState = () => {
  const [state, setState] = useState<TourState>({ completed: false, stage: null });

  useEffect(() => {
    let active = true;

    initializeTourState().then((initialState) => {
      if (active) {
        setState(initialState);
      }
    });

    const unsubscribe = subscribeTourState((nextState) => {
      if (active) {
        setState(nextState);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
};

export const initializeTourState = async (): Promise<TourState> => {
  if (cachedState) {
    return cachedState;
  }

  const storedCompleted = await AsyncStorage.getItem(TOUR_COMPLETED_KEY);
  const storedStage = await AsyncStorage.getItem(TOUR_STAGE_KEY);
  const completed = storedCompleted === 'true';
  let stage: TourStage | null = isValidStage(storedStage) ? storedStage : null;

  if (!completed && !stage) {
    stage = 'pomodoro';
    await AsyncStorage.setItem(TOUR_STAGE_KEY, stage);
  }

  const nextState = { completed, stage };
  updateCachedState(nextState);
  return nextState;
};

export const setTourStage = async (stage: TourStage) => {
  const nextState: TourState = { completed: false, stage };
  updateCachedState(nextState);
  await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'false');
  await AsyncStorage.setItem(TOUR_STAGE_KEY, stage);
};

export const markTourCompleted = async () => {
  const nextState: TourState = { completed: true, stage: null };
  updateCachedState(nextState);
  await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  await AsyncStorage.removeItem(TOUR_STAGE_KEY);
};

export const resetTour = async () => {
  const nextState: TourState = { completed: false, stage: 'pomodoro' };
  updateCachedState(nextState);
  await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'false');
  await AsyncStorage.setItem(TOUR_STAGE_KEY, 'pomodoro');
};

export const getNextStage = (stage: TourStage): TourStage | null => {
  const index = STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[index + 1];
};

export const navigateToStage = (stage: TourStage) => {
  switch (stage) {
    case 'pomodoro':
      resetTo('RootTabs', { screen: 'Pomodoro' } as any);
      break;
    case 'tasks':
      resetTo('RootTabs', { screen: 'Tasks' } as any);
      break;
    case 'analytics':
      resetTo('RootTabs', { screen: 'Analytics' } as any);
      break;
    case 'activityTypes':
      resetTo('ActivityTypesManager');
      break;
    case 'paywall':
      resetTo('Paywall');
      break;
    default:
      break;
  }
};

export const advanceTourFromStage = async (stage: TourStage) => {
  const nextStage = getNextStage(stage);
  if (!nextStage) {
    await markTourCompleted();
    return;
  }

  await setTourStage(nextStage);
  navigateToStage(nextStage);
};
