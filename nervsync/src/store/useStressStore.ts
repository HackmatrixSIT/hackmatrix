import { create } from 'zustand';

export type AppState = 'CALM' | 'STRESS' | 'AGITATION';

interface StressState {
  stressScore: number;     // 0 - 100
  appState: AppState;
  isDemoMode: boolean;

  setStressScore: (score: number) => void;
  setAppState: (state: AppState) => void;
  toggleDemoMode: () => void;
}

export const useStressStore = create<StressState>((set) => ({
  stressScore: 0,
  appState: 'CALM',
  isDemoMode: false,

  setStressScore: (score) =>
    set({ stressScore: Math.min(100, Math.max(0, Math.round(score))) }),

  setAppState: (appState) => set({ appState }),

  toggleDemoMode: () =>
    set((s) => ({ isDemoMode: !s.isDemoMode })),
}));
