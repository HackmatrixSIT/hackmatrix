import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet, View, Text, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useStressStore, StressIntensity } from '../store/useStressStore';
import type { AppScreen } from '../../app/(tabs)';

const { width } = Dimensions.get('window');
const SCAN_DURATION = 10; // seconds

interface Props { onNavigate: (s: AppScreen) => void; }

export const BaselineScanScreen = ({ onNavigate }: Props) => {
    const setBaselineIntensity = useStressStore((s) => s.setBaselineIntensity);
    const setAppState = useStressStore((s) => s.setAppState);

    const [secondsLeft, setSecondsLeft] = useState(SCAN_DURATION);
    const [phase, setPhase] = useState<'scanning' | 'done'>('scanning');
    const [result, setResult] = useState<StressIntensity>('LOW');

    const samplesRef = useRef<number[]>([]);
    const ringScale = useSharedValue(0.8);
    const ringOpacity = useSharedValue(0.6);
    const progress = useSharedValue(0);

    // Ring pulse
    useEffect(() => {
        ringScale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            ),
            -1, false
        );
        progress.value = withTiming(1, { duration: SCAN_DURATION * 1000 });
    }, []);

    // Countdown + sensor reading
    useEffect(() => {
        Accelerometer.setUpdateInterval(100);
        const sub = Accelerometer.addListener(({ x, y, z }) => {
            const mag = Math.sqrt(x * x + y * y + z * z);
            samplesRef.current.push(Math.abs(mag - 1));
        });

        const tick = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(tick);
                    sub.remove();
                    finalize();
                    return 0;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return prev - 1;
            });
        }, 1000);

        return () => { clearInterval(tick); sub.remove(); };
    }, []);

    const finalize = () => {
        const samples = samplesRef.current;
        if (samples.length === 0) { setResult('LOW'); setPhase('done'); return; }

        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const score = Math.min(100, avg * 120);

        let intensity: StressIntensity = 'LOW';
        if (score >= 40) intensity = 'HIGH';
        else if (score >= 15) intensity = 'MODERATE';

        setResult(intensity);
        setBaselineIntensity(intensity);

        // Also sync app state
        if (intensity === 'HIGH') setAppState('AGITATION');
        else if (intensity === 'MODERATE') setAppState('STRESS');
        else setAppState('CALM');

        setPhase('done');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringScale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scaleX: progress.value }],
    }));

    const intensityLabel = result === 'LOW' ? '😌  Calm Baseline' :
        result === 'MODERATE' ? '⚡  Mild Anxiety' :
            '🔥  High Stress';
    const intensityColor = result === 'LOW' ? '#00FFDD' :
        result === 'MODERATE' ? '#FFB800' : '#FF3355';
    const sessionDescription =
        result === 'LOW' ? 'Gentle ocean breathing with soft haptics.' :
            result === 'MODERATE' ? 'Paced breathing with stronger visual anchoring.' :
                'Grounding mode — slow rhythmic vibration + deep breath cycles.';

    return (
        <LinearGradient colors={['#000D1A', '#001A2C']} style={styles.container}>
            <SafeAreaView style={styles.safe}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onNavigate('HOME')} style={styles.backBtn}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Baseline Scan</Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Scanning Ring */}
                <View style={styles.center}>
                    {phase === 'scanning' ? (
                        <>
                            <Animated.View style={[styles.outerRing, ringStyle]}>
                                <View style={styles.innerRing}>
                                    <Text style={styles.countdown}>{secondsLeft}</Text>
                                    <Text style={styles.countdownSub}>seconds</Text>
                                </View>
                            </Animated.View>
                            <Text style={styles.scanLabel}>Reading your nervous system…</Text>
                            <Text style={styles.scanHint}>Hold the phone naturally. Don't move.</Text>

                            {/* Progress bar */}
                            <View style={styles.progressTrack}>
                                <Animated.View style={[styles.progressFill, progressStyle]} />
                            </View>
                        </>
                    ) : (
                        /* Result Card */
                        <View style={styles.resultCard}>
                            <Text style={styles.resultEmoji}>
                                {result === 'LOW' ? '🌊' : result === 'MODERATE' ? '🌤' : '⚡'}
                            </Text>
                            <Text style={styles.resultTitle}>Scan Complete</Text>
                            <View style={[styles.resultBadge, { borderColor: intensityColor }]}>
                                <Text style={[styles.resultBadgeText, { color: intensityColor }]}>
                                    {intensityLabel}
                                </Text>
                            </View>
                            <Text style={styles.resultDesc}>{sessionDescription}</Text>

                            <TouchableOpacity
                                style={[styles.startBtn, { backgroundColor: intensityColor + '22', borderColor: intensityColor }]}
                                onPress={() => onNavigate('MEDITATION')}
                            >
                                <Text style={[styles.startBtnText, { color: intensityColor }]}>
                                    Begin Session →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1, paddingHorizontal: 24 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 12, paddingBottom: 8,
    },
    backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    backText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    outerRing: {
        width: width * 0.65, height: width * 0.65, borderRadius: width * 0.325,
        borderWidth: 2, borderColor: 'rgba(0,255,200,0.4)',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,255,200,0.04)',
    },
    innerRing: {
        width: width * 0.45, height: width * 0.45, borderRadius: width * 0.225,
        borderWidth: 1.5, borderColor: 'rgba(0,255,200,0.6)',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,255,200,0.08)',
    },
    countdown: { fontSize: 64, fontWeight: '100', color: '#00FFDD' },
    countdownSub: { fontSize: 12, color: 'rgba(0,255,200,0.6)', letterSpacing: 3, textTransform: 'uppercase' },
    scanLabel: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 36, textAlign: 'center' },
    scanHint: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 8, textAlign: 'center' },
    progressTrack: {
        width: width * 0.6, height: 3, backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 99, overflow: 'hidden', marginTop: 32,
    },
    progressFill: {
        height: 3, backgroundColor: '#00FFDD', borderRadius: 99,
        transformOrigin: 'left',
    },

    resultCard: { alignItems: 'center', paddingHorizontal: 16 },
    resultEmoji: { fontSize: 64, marginBottom: 16 },
    resultTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 16 },
    resultBadge: {
        paddingHorizontal: 20, paddingVertical: 8,
        borderRadius: 999, borderWidth: 1.5, marginBottom: 20,
    },
    resultBadgeText: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
    resultDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
    startBtn: {
        paddingHorizontal: 36, paddingVertical: 16,
        borderRadius: 16, borderWidth: 1.5,
    },
    startBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
