/**
 * Audio Radar — Microphone Metering Module
 * 
 * Uses expo-av to sample audio dB levels every 500ms.
 * NO audio recording is stored — metering only.
 * Provides raw dB readings + spike detection.
 */

import { Audio } from 'expo-av';

export interface AudioSample {
    timestamp: number;   // ms epoch
    dB: number;          // normalized 0–100
}

export interface AudioRadarState {
    currentdB: number;
    samples: AudioSample[];
    spikeDetected: boolean;
}

const MAX_SAMPLES = 60; // rolling window: 60 samples × 500ms = 30 seconds
const SPIKE_THRESHOLD_DB = 15; // >15 dB jump in <1s = spike
const SAMPLE_INTERVAL_MS = 500;

let recording: Audio.Recording | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let samples: AudioSample[] = [];
let onSampleCallback: ((state: AudioRadarState) => void) | null = null;

/**
 * Normalize raw metering dB to 0–100 scale.
 * expo-av metering returns values typically from -160 (silence) to 0 (max).
 * We map -80..0 → 0..100 for practical usage.
 */
function normalizeDB(rawDB: number): number {
    // Clamp to practical range
    const clamped = Math.max(-80, Math.min(0, rawDB));
    // Map -80..0 → 0..100
    return Math.round(((clamped + 80) / 80) * 100);
}

/**
 * Detect if a spike occurred: >15 dB jump within the last 1 second (2 samples).
 */
function detectSpike(currentSamples: AudioSample[]): boolean {
    if (currentSamples.length < 2) return false;

    const latest = currentSamples[currentSamples.length - 1];
    // Check against samples within last 1 second
    for (let i = currentSamples.length - 2; i >= 0; i--) {
        const older = currentSamples[i];
        if (latest.timestamp - older.timestamp > 1000) break;
        if (Math.abs(latest.dB - older.dB) >= SPIKE_THRESHOLD_DB) {
            return true;
        }
    }
    return false;
}

function processSample(rawDB: number) {
    const normalized = normalizeDB(rawDB);
    const now = Date.now();

    samples.push({ timestamp: now, dB: normalized });

    // Keep rolling window
    if (samples.length > MAX_SAMPLES) {
        samples = samples.slice(-MAX_SAMPLES);
    }

    const spikeDetected = detectSpike(samples);

    if (onSampleCallback) {
        onSampleCallback({
            currentdB: normalized,
            samples: [...samples],
            spikeDetected,
        });
    }
}

/**
 * Start audio metering. Does NOT record/store audio.
 * Requires microphone permission.
 */
export async function startAudioRadar(
    callback: (state: AudioRadarState) => void,
): Promise<boolean> {
    try {
        onSampleCallback = callback;

        // Request microphone permission
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
            console.warn('[AudioRadar] Microphone permission denied');
            return false;
        }

        // Configure audio session for metering
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        // Start recording with metering enabled
        const { recording: rec } = await Audio.Recording.createAsync(
            {
                ...Audio.RecordingOptionsPresets.LOW_QUALITY,
                android: {
                    ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
                    extension: '.3gp',
                },
                ios: {
                    ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
                    extension: '.caf',
                },
            },
            undefined,
            100, // metering update interval ms
        );

        recording = rec;

        // Sample metering every 500ms
        intervalId = setInterval(async () => {
            try {
                if (!recording) return;
                const status = await recording.getStatusAsync();
                if (status.isRecording && status.metering !== undefined) {
                    processSample(status.metering);
                }
            } catch (err) {
                // Silently handle — recording may have been stopped
            }
        }, SAMPLE_INTERVAL_MS);

        return true;
    } catch (err) {
        console.warn('[AudioRadar] Failed to start:', err);
        return false;
    }
}

/**
 * Stop audio metering and clean up all resources.
 * Ensures no audio data is persisted.
 */
export async function stopAudioRadar(): Promise<void> {
    // Clear sampling interval
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }

    // Stop and unload recording
    if (recording) {
        try {
            const status = await recording.getStatusAsync();
            if (status.isRecording) {
                await recording.stopAndUnloadAsync();
            }
        } catch {
            // Already stopped
        }
        recording = null;
    }

    // Reset audio mode
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
    } catch {
        // ignore
    }

    // Clear state
    samples = [];
    onSampleCallback = null;
}

/**
 * Get current samples (read-only snapshot).
 */
export function getAudioSamples(): AudioSample[] {
    return [...samples];
}
