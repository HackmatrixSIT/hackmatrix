import { create } from 'zustand';

export type AppState = 'CALM' | 'STRESS' | 'AGITATION';
export type StressIntensity = 'LOW' | 'MODERATE' | 'HIGH';

interface StressState {
  stressScore: number;
  appState: AppState;
  isDemoMode: boolean;
  baselineIntensity: StressIntensity; // determined by 10-sec scan

  setStressScore: (score: number) => void;
  setAppState: (state: AppState) => void;
  toggleDemoMode: () => void;
  setBaselineIntensity: (i: StressIntensity) => void;
}

export const useStressStore = create<StressState>((set) => ({
  stressScore: 0,
  appState: 'CALM',
  isDemoMode: false,
  baselineIntensity: 'LOW',

  setStressScore: (score) =>
    set({ stressScore: Math.min(100, Math.max(0, Math.round(score))) }),
  setAppState: (appState) => set({ appState }),
  toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),
  setBaselineIntensity: (baselineIntensity) => set({ baselineIntensity }),
}));
