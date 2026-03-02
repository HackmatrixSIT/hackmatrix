/**
 * Sensory Engine — Computes sensoryLoad score from audio radar data.
 *
 * Inputs: currentdB, spikeDetected, rolling samples
 * Output: sensoryLoad (0–100)
 *
 * Formula:
 *   sensoryLoad = (avgdB * 0.4) + (variance * 0.3) + (spikeScore * 0.3)
 */

import type { AudioSample } from './audioRadar';

export interface SensoryState {
    sensoryLoad: number;       // 0–100
    avgdB: number;             // rolling average dB
    variance: number;          // rolling variance (normalized 0–100)
    spikeCount: number;        // spikes in last 30s
    currentdB: number;         // latest dB reading
}

const SPIKE_WINDOW_MS = 30_000; // 30 second window for spike counting

/**
 * Compute rolling average from samples.
 */
function computeAverage(samples: AudioSample[]): number {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, s) => acc + s.dB, 0);
    return sum / samples.length;
}

/**
 * Compute rolling variance from samples (normalized to 0–100).
 * High variance = chaotic audio environment.
 */
function computeVariance(samples: AudioSample[]): number {
    if (samples.length < 2) return 0;
    const avg = computeAverage(samples);
    const squaredDiffs = samples.map((s) => (s.dB - avg) ** 2);
    const rawVariance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    // Normalize: variance of 400 (stdDev=20) maps to ~100
    return Math.min(100, Math.round((rawVariance / 400) * 100));
}

/**
 * Count spikes (>15dB jumps) within the last 30 seconds.
 */
function countSpikes(samples: AudioSample[]): number {
    if (samples.length < 2) return 0;

    const now = Date.now();
    const cutoff = now - SPIKE_WINDOW_MS;
    const recent = samples.filter((s) => s.timestamp > cutoff);

    let spikes = 0;
    for (let i = 1; i < recent.length; i++) {
        if (Math.abs(recent[i].dB - recent[i - 1].dB) >= 15) {
            spikes++;
        }
    }
    return spikes;
}

/**
 * Compute the sensoryLoad score (0–100).
 *
 * Components:
 *   - avgdB (40%):      Sustained loud environment
 *   - variance (30%):   Chaotic / unpredictable audio
 *   - spikeScore (30%): Sudden loud events
 */
export function computeSensoryLoad(
    samples: AudioSample[],
    currentdB: number,
): SensoryState {
    const avgdB = computeAverage(samples);
    const variance = computeVariance(samples);
    const spikeCount = countSpikes(samples);

    // Spike score: each spike adds 20, capped at 100
    const spikeScore = Math.min(100, spikeCount * 20);

    // Weighted combination
    const raw = (avgdB * 0.4) + (variance * 0.3) + (spikeScore * 0.3);
    const sensoryLoad = Math.min(100, Math.max(0, Math.round(raw)));

    return {
        sensoryLoad,
        avgdB: Math.round(avgdB),
        variance,
        spikeCount,
        currentdB,
    };
}
