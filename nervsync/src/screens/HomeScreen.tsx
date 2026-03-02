import React, { useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, SafeAreaView,
    Dimensions, TouchableOpacity, Platform,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withRepeat, withSequence, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStressStore, AppState } from '../store/useStressStore';
import { useMotionListener } from '../sensors/motionListener';
import { THEME } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = width * 0.62;

// ─────────────────────────────────────────────────────
// BREATHING ORB — Interactive animated core
// Features:
//   • Pulse speed tied to stress state
//   • Drag it around (springs back)
//   • Slow-drag DOWN → reduces stress (regulation)
//   • Haptic buzz on every state change
// ─────────────────────────────────────────────────────
const BreathingOrb = () => {
    const stressScore = useStressStore((s) => s.stressScore);
    const appState = useStressStore((s) => s.appState);
    const setStressScore = useStressStore((s) => s.setStressScore);

    const scale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const orbOpacity = useSharedValue(1);

    // Stable JS callback for runOnJS (must be stable ref)
    const reduceStress = useCallback(() => {
        setStressScore(stressScore - 2);
    }, [stressScore, setStressScore]);

    // Pulse animation — speed reacts to state
    useEffect(() => {
        const d = appState === 'CALM' ? 4200 : appState === 'STRESS' ? 2000 : 900;
        scale.value = withRepeat(
            withSequence(
                withTiming(1.28, { duration: d, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.92, { duration: d, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            false,
        );
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(
                appState === 'CALM'
                    ? Haptics.ImpactFeedbackStyle.Light
                    : appState === 'STRESS'
                        ? Haptics.ImpactFeedbackStyle.Medium
                        : Haptics.ImpactFeedbackStyle.Heavy
            );
        }
    }, [appState]);

    // Drag gesture with runOnJS for regulation
    const drag = Gesture.Pan()
        .onUpdate((e) => {
            'worklet';
            tx.value = e.translationX;
            ty.value = e.translationY;

            // FEATURE: Slow downward drag = intentional calming action
            if (e.translationY > 60 && Math.abs(e.velocityY) < 600) {
                runOnJS(reduceStress)();
            }
        })
        .onEnd(() => {
            'worklet';
            tx.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
            ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
        });

    const orbColor =
        appState === 'CALM' ? THEME.colors.calm.primary :
            appState === 'STRESS' ? THEME.colors.stress.primary :
                THEME.colors.agitation.primary;

    const glowColor =
        appState === 'CALM' ? THEME.colors.calm.secondary :
            appState === 'STRESS' ? THEME.colors.stress.secondary :
                THEME.colors.agitation.secondary;

    const orbLabel =
        appState === 'CALM' ? 'Breathe' :
            appState === 'STRESS' ? 'Slow Down' :
                'Regulate';

    const animatedOrb = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: tx.value },
            { translateY: ty.value },
        ],
    }));

    return (
        <View style={styles.orbWrapper}>
            <GestureDetector gesture={drag}>
                <Animated.View
                    style={[
                        styles.orb,
                        { backgroundColor: orbColor, shadowColor: glowColor },
                        animatedOrb,
                    ]}
                >
                    {/* Inner shimmer highlight */}
                    <View style={styles.innerGlow} />
                    {/* Second inner ring */}
                    <View style={[styles.innerRing, { borderColor: glowColor + '55' }]} />
                    {/* Instruction label */}
                    <Text style={styles.orbLabel}>{orbLabel}</Text>
                    <Text style={styles.orbSublabel}>
                        {appState !== 'CALM' ? '↓ drag down to calm' : ''}
                    </Text>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

// ─────────────────────────────────────────────────────
// CHAOS FIELD — Background particles (stress indicator)
// Features:
//   • Invisible during CALM
//   • Move faster as stress rises
//   • Change color in AGITATION (red/magenta)
// ─────────────────────────────────────────────────────
const Particle = React.memo(({ index, score, state }: { index: number; score: number; state: AppState }) => {
    const x = useSharedValue(Math.random() * width);
    const y = useSharedValue(Math.random() * height);
    const particleScale = useSharedValue(0.5 + Math.random());

    useEffect(() => {
        const speed = Math.max(600, 5000 - score * 40);
        const delay = index * 50;
        x.value = withRepeat(
            withTiming(Math.random() * width, { duration: speed + delay }),
            -1, true
        );
        y.value = withRepeat(
            withTiming(Math.random() * height, { duration: speed + delay * 1.3 }),
            -1, true
        );
        particleScale.value = withRepeat(
            withSequence(
                withTiming(1.5, { duration: speed / 2 }),
                withTiming(0.3, { duration: speed / 2 }),
            ),
            -1, true
        );
    }, [score]);

    const baseColor = state === 'AGITATION' ? '#FF2266' : '#00E5FF';
    const size = 4 + (index % 5) * 5;

    const style = useAnimatedStyle(() => ({
        opacity: 0.12 + score / 250,
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { scale: particleScale.value },
        ],
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: baseColor },
                style,
            ]}
        />
    );
});

const ChaosField = () => {
    const score = useStressStore((s) => s.stressScore);
    const state = useStressStore((s) => s.appState);
    if (state === 'CALM') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[...Array(14)].map((_, i) => (
                <Particle key={i} index={i} score={score} state={state} />
            ))}
        </View>
    );
};

// ─────────────────────────────────────────────────────
// STRESS BAR — Visual progress indicator
// ─────────────────────────────────────────────────────
const StressBar = ({ score }: { score: number }) => {
    const barWidth = useSharedValue(0);

    useEffect(() => {
        barWidth.value = withTiming(score / 100, { duration: 600 });
    }, [score]);

    const barStyle = useAnimatedStyle(() => ({
        flex: barWidth.value,
        backgroundColor:
            score < 30 ? THEME.colors.calm.primary :
                score < 60 ? THEME.colors.stress.primary :
                    THEME.colors.agitation.primary,
    }));

    return (
        <View style={styles.barContainer}>
            <Animated.View style={[styles.barFill, barStyle]} />
            <View style={{ flex: Math.max(0, 1 - score / 100) }} />
        </View>
    );
};

// ─────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────
export const HomeScreen = () => {
    const stressScore = useStressStore((s) => s.stressScore);
    const appState = useStressStore((s) => s.appState);
    const isDemoMode = useStressStore((s) => s.isDemoMode);
    const toggleDemoMode = useStressStore((s) => s.toggleDemoMode);
    const setStressScore = useStressStore((s) => s.setStressScore);
    const setAppState = useStressStore((s) => s.setAppState);

    // Real-time sensor hook
    useMotionListener();

    const bg: [string, string] =
        appState === 'CALM' ? ['#001A2C', '#003333'] :
            appState === 'STRESS' ? ['#1A0E00', '#2E1800'] :
                ['#1E0010', '#3A0000'];

    const badgeColor =
        appState === 'CALM' ? THEME.colors.calm.primary :
            appState === 'STRESS' ? THEME.colors.stress.primary :
                THEME.colors.agitation.primary;

    const hint =
        appState === 'CALM'
            ? 'Calm detected. Keep breathing.'
            : appState === 'STRESS'
                ? 'Elevated. Follow the orb rhythm.'
                : 'High agitation. Drag the orb downward slowly to regulate.';

    // FEATURE: Rapid tap detection — increases stress (simulates stressed tapping behavior)
    const lastTap = useRef(0);
    const onTap = useCallback(() => {
        if (isDemoMode) return;
        const now = Date.now();
        if (now - lastTap.current < 400) {
            // Rapid tap! Increase stress by 3
            setStressScore(stressScore + 3);
        }
        lastTap.current = now;
    }, [isDemoMode, stressScore, setStressScore]);

    return (
        <LinearGradient colors={bg} style={styles.container}>
            <ChaosField />

            <SafeAreaView style={styles.safe}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.appName}>NervSync</Text>
                        <Text style={styles.appTagline}>Nervous System Regulator</Text>
                    </View>
                    <View style={[styles.badge, { borderColor: badgeColor }]}>
                        <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
                        <Text style={styles.badgeText}>{appState}</Text>
                    </View>
                </View>

                {/* ── ORB ── */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onTap}
                    style={styles.orbTouchable}
                >
                    <BreathingOrb />
                </TouchableOpacity>

                {/* ── STATS ── */}
                <View style={styles.statsSection}>
                    <Text style={styles.statLabel}>NERVOUS LOAD</Text>
                    <Text style={styles.statValue}>{stressScore}<Text style={styles.percent}>%</Text></Text>
                    <StressBar score={stressScore} />
                    <Text style={styles.hintText}>{hint}</Text>
                </View>

                {/* ── DEMO CONTROLS ── */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.demoBtn} onPress={toggleDemoMode}>
                        <Text style={styles.demoBtnText}>
                            {isDemoMode ? '🔓  Manual Override  ON' : '🔒  Live Sensor Mode'}
                        </Text>
                    </TouchableOpacity>

                    {isDemoMode && (
                        <View style={styles.demoRow}>
                            {([
                                { label: '😌 CALM', score: 10, state: 'CALM' },
                                { label: '⚡ STRESS', score: 55, state: 'STRESS' },
                                { label: '🔥 AGITATION', score: 88, state: 'AGITATION' },
                            ] as const).map((item) => (
                                <TouchableOpacity
                                    key={item.state}
                                    style={[styles.demoStateBtn, { borderColor: badgeColor }]}
                                    onPress={() => { setStressScore(item.score); setAppState(item.state); }}
                                >
                                    <Text style={styles.demoStateTxt}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
};

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1, paddingHorizontal: 22 },
    particle: { position: 'absolute' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingTop: 16, paddingBottom: 8,
    },
    appName: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
    appTagline: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 },

    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 999, borderWidth: 1.5,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    badgeDot: { width: 7, height: 7, borderRadius: 4 },
    badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

    // Orb
    orbTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    orbWrapper: { alignItems: 'center', justifyContent: 'center' },
    orb: {
        width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
        elevation: 30,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 50,
    },
    innerGlow: {
        position: 'absolute', top: '10%', left: '10%',
        width: '38%', height: '38%', borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    innerRing: {
        position: 'absolute',
        width: ORB_SIZE * 0.75, height: ORB_SIZE * 0.75,
        borderRadius: ORB_SIZE * 0.375,
        borderWidth: 1,
    },
    orbLabel: {
        color: '#FFF', fontSize: 17, fontWeight: '800',
        letterSpacing: 3, textTransform: 'uppercase',
    },
    orbSublabel: {
        color: 'rgba(255,255,255,0.5)', fontSize: 11,
        letterSpacing: 1, marginTop: 6, textTransform: 'lowercase',
    },

    // Stats
    statsSection: { alignItems: 'center', paddingBottom: 10 },
    statLabel: {
        color: 'rgba(255,255,255,0.4)', fontSize: 11,
        letterSpacing: 4, textTransform: 'uppercase',
    },
    statValue: { fontSize: 80, fontWeight: '100', color: '#FFF', lineHeight: 90 },
    percent: { fontSize: 36, fontWeight: '100', color: 'rgba(255,255,255,0.6)' },

    barContainer: {
        flexDirection: 'row', width: width * 0.55, height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 99, overflow: 'hidden', marginTop: 10,
    },
    barFill: { borderRadius: 99, minWidth: 4 },

    hintText: {
        color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center',
        marginTop: 14, paddingHorizontal: 30, lineHeight: 20,
    },

    // Footer
    footer: { alignItems: 'center', paddingBottom: 28 },
    demoBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 22, paddingVertical: 11,
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    demoBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
    demoRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    demoStateBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12, paddingVertical: 9,
        borderRadius: 10, borderWidth: 1,
    },
    demoStateTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
