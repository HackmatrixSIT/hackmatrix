import { create } from 'zustand';

export type AppState = 'CALM' | 'STRESS' | 'AGITATION';
export type StressIntensity = 'LOW' | 'MODERATE' | 'HIGH';

interface StressState {
  stressScore: number;
  emotionScore: number; // 0-100 from ML
  movementIntensity: number; // raw value for debug
  appState: AppState;
  isDemoMode: boolean;
  baselineIntensity: StressIntensity; // determined by 10-sec scan
  focusShieldEnabled: boolean;        // simplified UI mode
  debugMode: boolean;

  setStressScore: (score: number) => void;
  setEmotionScore: (score: number) => void;
  setAppState: (state: AppState) => void;
  toggleDemoMode: () => void;
  toggleDebug: () => void;
  setBaselineIntensity: (i: StressIntensity) => void;
  setFocusShield: (enabled: boolean) => void;
  setMovementIntensity: (intensity: number) => void;
}

export const useStressStore = create<StressState>()((set) => ({
  stressScore: 0,
  emotionScore: 0,
  movementIntensity: 0,
  appState: 'CALM',
  isDemoMode: false,
  debugMode: false,
  baselineIntensity: 'LOW',
  focusShieldEnabled: false,

  setStressScore: (score) =>
    set({ stressScore: Math.min(100, Math.max(0, Math.round(score))) }),
  setEmotionScore: (emotionScore) => set({ emotionScore }),
  setAppState: (appState) => set({ appState }),
  toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),
  toggleDebug: () => set((s) => ({ debugMode: !s.debugMode })),
  setBaselineIntensity: (baselineIntensity) => set({ baselineIntensity }),
  setFocusShield: (enabled) => set({ focusShieldEnabled: enabled }),
  setMovementIntensity: (movementIntensity) => set({ movementIntensity }),
}));

