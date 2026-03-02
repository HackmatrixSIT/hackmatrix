import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { useStressStore } from '../store/useStressStore';

// ─── Tuning Constants ───────────────────────────────────
const SENSITIVITY = 120;      // delta * SENSITIVITY → raw score
const WINDOW = 10;       // rolling average window (1s at 10Hz)

// ENTRY thresholds (score must RISE above these to enter state)
const STRESS_ENTER = 4;        // tiny nudge → STRESS
const AGITATION_ENTER = 58;      // hard shake → AGITATION

// EXIT thresholds (score must FALL below these to leave state — hysteresis)
const AGITATION_EXIT = 25;       // must be very calm to leave AGITATION
const STRESS_EXIT = 2;        // near perfect stillness to leave STRESS

// Minimum time to hold each state (ms) before considering downgrade
const AGITATION_HOLD_MS = 45_000;  // 45 seconds in AGITATION
const STRESS_HOLD_MS = 60_000;  // 60 seconds in STRESS
// ────────────────────────────────────────────────────────

const history: number[] = [];

function rollingAverage(val: number): number {
    history.push(val);
    if (history.length > WINDOW) history.shift();
    return history.reduce((a, b) => a + b, 0) / history.length;
}

export const useMotionListener = () => {
    const setStressScore = useStressStore((s) => s.setStressScore);
    const setAppState = useStressStore((s) => s.setAppState);
    const isDemoMode = useStressStore((s) => s.isDemoMode);

    const isDemoRef = useRef(isDemoMode);
    isDemoRef.current = isDemoMode;

    // Current locked state
    const stateRef = useRef<'CALM' | 'STRESS' | 'AGITATION'>('CALM');

    // Timestamps of when each state was LAST triggered
    const lastAgitationTime = useRef<number>(0);
    const lastStressTime = useRef<number>(0);

    useEffect(() => {
        Accelerometer.setUpdateInterval(100); // 10 Hz

        const sub = Accelerometer.addListener(({ x, y, z }) => {
            if (isDemoRef.current) return;

            // 1. Calculate motion delta from 1G (still = 0)
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            const delta = Math.abs(magnitude - 1);

            // 2. Smooth with rolling average
            const avg = rollingAverage(delta);
            const score = Math.min(100, Math.round(avg * SENSITIVITY));

            setStressScore(score);

            const now = Date.now();

            // ── STATE MACHINE WITH HYSTERESIS ──────────────────
            //
            //  CALM ──(score ≥ 4)──► STRESS ──(score ≥ 58)──► AGITATION
            //                          ▲                           │
            //                          └──(score < 25, held 45s)──┘
            //                 CALM ◄──(score < 2, held 60s)
            // ────────────────────────────────────────────────────

            const current = stateRef.current;

            if (current === 'CALM') {
                // Can only go UP from CALM
                if (score >= AGITATION_ENTER) {
                    stateRef.current = 'AGITATION';
                    lastAgitationTime.current = now;
                    lastStressTime.current = now;
                    setAppState('AGITATION');
                } else if (score >= STRESS_ENTER) {
                    stateRef.current = 'STRESS';
                    lastStressTime.current = now;
                    setAppState('STRESS');
                }

            } else if (current === 'STRESS') {
                // Can go UP to AGITATION, or DOWN to CALM only after hold
                if (score >= AGITATION_ENTER) {
                    stateRef.current = 'AGITATION';
                    lastAgitationTime.current = now;
                    lastStressTime.current = now;
                    setAppState('AGITATION');
                } else if (score >= STRESS_ENTER) {
                    // Refresh stress hold timer while still stressed
                    lastStressTime.current = now;
                } else {
                    // Score is low — only go to CALM if hold has expired
                    const held = now - lastStressTime.current;
                    if (held >= STRESS_HOLD_MS && score < STRESS_EXIT) {
                        stateRef.current = 'CALM';
                        setAppState('CALM');
                    }
                    // else: stay in STRESS (sticky hold active)
                }

            } else if (current === 'AGITATION') {
                if (score >= AGITATION_ENTER) {
                    // Still agitated — keep refreshing hold timer
                    lastAgitationTime.current = now;
                    lastStressTime.current = now;
                } else if (score >= STRESS_ENTER) {
                    // Somewhat calmer, but only drop to STRESS after hold expiry
                    lastStressTime.current = now;
                    const heldAgitation = now - lastAgitationTime.current;
                    if (heldAgitation >= AGITATION_HOLD_MS && score < AGITATION_EXIT) {
                        stateRef.current = 'STRESS';
                        setAppState('STRESS');
                    }
                    // Refresh agitation timer so it doesn't keep counting down mid-shake
                    if (score >= AGITATION_ENTER * 0.6) {
                        lastAgitationTime.current = now;
                    }
                } else {
                    // Very low score — only leave if BOTH hold timers have expired
                    const heldAgitation = now - lastAgitationTime.current;
                    const heldStress = now - lastStressTime.current;
                    if (heldAgitation >= AGITATION_HOLD_MS && score < AGITATION_EXIT) {
                        stateRef.current = 'STRESS';
                        setAppState('STRESS');
                    }
                    if (heldStress >= STRESS_HOLD_MS && score < STRESS_EXIT) {
                        stateRef.current = 'CALM';
                        setAppState('CALM');
                    }
                }
            }
        });

        return () => sub.remove();
    }, []);
};
