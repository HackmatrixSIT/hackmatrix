/**
 * useSensoryLoad — React hook for real-time environmental stress radar.
 *
 * Starts audio metering via audioRadar, computes sensoryLoad via sensoryEngine,
 * and exposes all metrics + focusShield trigger state.
 *
 * Handles full cleanup on unmount (no memory leaks).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { startAudioRadar, stopAudioRadar } from '@/src/logic/audioRadar';
import { computeSensoryLoad, type SensoryState } from '@/src/logic/sensoryEngine';
import type { AudioRadarState } from '@/src/logic/audioRadar';

export interface SensoryLoadState extends SensoryState {
    isActive: boolean;           // is metering running?
    shouldTriggerShield: boolean; // sensoryLoad > 60?
    permissionDenied: boolean;
}

const SHIELD_THRESHOLD = 60;

export function useSensoryLoad() {
    const [state, setState] = useState<SensoryLoadState>({
        sensoryLoad: 0,
        avgdB: 0,
        variance: 0,
        spikeCount: 0,
        currentdB: 0,
        isActive: false,
        shouldTriggerShield: false,
        permissionDenied: false,
    });

    const isActiveRef = useRef(false);
    const mountedRef = useRef(true);

    // Callback receives every audio sample update
    const handleSample = useCallback((radarState: AudioRadarState) => {
        if (!mountedRef.current) return;

        const sensory = computeSensoryLoad(
            radarState.samples,
            radarState.currentdB,
        );

        setState({
            ...sensory,
            isActive: true,
            shouldTriggerShield: sensory.sensoryLoad > SHIELD_THRESHOLD,
            permissionDenied: false,
        });
    }, []);

    // Start metering
    const start = useCallback(async () => {
        if (isActiveRef.current) return;
        isActiveRef.current = true;

        const success = await startAudioRadar(handleSample);

        if (!success && mountedRef.current) {
            setState((prev) => ({
                ...prev,
                isActive: false,
                permissionDenied: true,
            }));
            isActiveRef.current = false;
        }
    }, [handleSample]);

    // Stop metering
    const stop = useCallback(async () => {
        isActiveRef.current = false;
        await stopAudioRadar();

        if (mountedRef.current) {
            setState((prev) => ({
                ...prev,
                isActive: false,
                shouldTriggerShield: false,
            }));
        }
    }, []);

    // Auto-start on mount, cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        start();

        return () => {
            mountedRef.current = false;
            stopAudioRadar(); // fire-and-forget cleanup
        };
    }, []);

    return {
        ...state,
        start,
        stop,
    };
}
