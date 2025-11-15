import { create } from 'zustand';

export type TimerMode = 'focus' | 'break';

interface TimerState {
  mode: TimerMode;
  focusDuration: number;
  breakDuration: number;
  isRunning: boolean;
  setMode: (mode: TimerMode) => void;
  setFocusDuration: (minutes: number) => void;
  setBreakDuration: (minutes: number) => void;
  toggleRunning: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  mode: 'focus',
  focusDuration: 25,
  breakDuration: 5,
  isRunning: false,
  setMode: (mode) => set({ mode }),
  setFocusDuration: (minutes) => set({ focusDuration: minutes }),
  setBreakDuration: (minutes) => set({ breakDuration: minutes }),
  toggleRunning: () => set((state) => ({ isRunning: !state.isRunning })),
}));
