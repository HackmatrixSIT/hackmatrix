import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    TouchableOpacity, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type { AppScreen } from '../../app/(tabs)';
import {
    recordSpike,
    recordRecovery,
    recordIgnoredPrompt,
    evaluateIntervention,
    getLiveInsights,
    CoachDecision
} from '../logic/aiCoach';
import { HiddenCamera } from '../components/HiddenCamera';

const { width, height } = Dimensions.get('window');
const ORB_SIZE = width * 0.60;
const SIDEBAR_W = width * 0.72;

// ─────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (s: AppScreen) => void;
    appState: AppState;
    stressScore: number;
}

const Sidebar = ({ isOpen, onClose, onNavigate, appState, stressScore }: SidebarProps) => {
    const tx = useSharedValue(-SIDEBAR_W);
    const overlayOp = useSharedValue(0);

    useEffect(() => {
        tx.value = withTiming(isOpen ? 0 : -SIDEBAR_W, { duration: 320, easing: Easing.out(Easing.cubic) });
        overlayOp.value = withTiming(isOpen ? 0.55 : 0, { duration: 320 });
    }, [isOpen]);

    const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
    const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));

    if (!isOpen && tx.value === -SIDEBAR_W) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
            {/* Dimmed overlay */}
            <Animated.View style={[styles.sidebarOverlay, overlayStyle]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Panel */}
            <Animated.View style={[styles.sidebarPanel, panelStyle]}>
                <LinearGradient colors={['#001020', '#000D1A']} style={StyleSheet.absoluteFill} />

                {/* Profile block */}
                <SafeAreaView edges={['top']} style={styles.sidebarSafe}>
                    <View style={styles.sidebarProfile}>
                        <View style={styles.avatarRing}>
                            <Text style={styles.avatarEmoji}>🧘</Text>
                        </View>
                        <View style={{ marginLeft: 14 }}>
                            <Text style={styles.profileName}>NervSync</Text>
                            <View style={[styles.profileBadge, {
                                borderColor: appState === 'CALM' ? '#00FFDD' : appState === 'STRESS' ? '#FFB800' : '#FF4488'
                            }]}>
                                <Text style={styles.profileBadgeText}>{appState}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Stress indicator */}
                    <View style={styles.sidebarStressBlock}>
                        <Text style={styles.sidebarStressLabel}>Current Load</Text>
                        <Text style={styles.sidebarStressValue}>{stressScore}%</Text>
                        <View style={styles.sidebarBar}>
                            <View style={[styles.sidebarBarFill, {
                                width: `${stressScore}%`,
                                backgroundColor: stressScore < 30 ? '#00FFDD' : stressScore < 60 ? '#FFB800' : '#FF4488'
                            }]} />
                        </View>
                    </View>

                    {/* Navigation Items */}
                    <View style={styles.sidebarNav}>
                        <Text style={styles.sidebarNavHeader}>SESSIONS</Text>

                        <TouchableOpacity
                            style={styles.sidebarItem}
                            onPress={() => { onClose(); setTimeout(() => onNavigate('BASELINE_SCAN'), 350); }}
                        >
                            <Text style={styles.sidebarItemIcon}>🔬</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>Baseline Scan</Text>
                                <Text style={styles.sidebarItemSub}>10-sec nervous system read</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sidebarItem}
                            onPress={() => { onClose(); setTimeout(() => onNavigate('MEDITATION'), 350); }}
                        >
                            <Text style={styles.sidebarItemIcon}>🌌</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>Breath Field</Text>
                                <Text style={styles.sidebarItemSub}>Adaptive meditation session</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sidebarItem}
                            onPress={() => { onClose(); setTimeout(() => onNavigate('GAME'), 350); }}
                        >
                            <Text style={styles.sidebarItemIcon}>🫧</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>Bubble Burst</Text>
                                <Text style={styles.sidebarItemSub}>Pop bubbles to release stress</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sidebarItem}
                            onPress={() => { onClose(); setTimeout(() => onNavigate('COACH_CHAT'), 350); }}
                        >
                            <Text style={styles.sidebarItemIcon}>🤖</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>AI Coach Companion</Text>
                                <Text style={styles.sidebarItemSub}>Talk to your regulation guide</Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.sidebarNavHeader, { marginTop: 24 }]}>INFO</Text>

                        <View style={styles.sidebarItemDisabled}>
                            <Text style={styles.sidebarItemIcon}>📊</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>Session History</Text>
                                <Text style={styles.sidebarItemSub}>Coming soon</Text>
                            </View>
                        </View>

                        <View style={styles.sidebarItemDisabled}>
                            <Text style={styles.sidebarItemIcon}>⚙️</Text>
                            <View>
                                <Text style={styles.sidebarItemTitle}>Settings</Text>
                                <Text style={styles.sidebarItemSub}>Coming soon</Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer */}
                    <Text style={styles.sidebarFooter}>HackMatrix 2025 · NervSync v1.0</Text>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
};

// ─────────────────────────────────────────────────────
// BREATHING ORB
// ─────────────────────────────────────────────────────
const BreathingOrb = () => {
    const stressScore = useStressStore((s) => s.stressScore);
    const appState = useStressStore((s) => s.appState);
    const setStressScore = useStressStore((s) => s.setStressScore);

    const scale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    const reduceStress = useCallback(() => {
        setStressScore(stressScore - 2);
    }, [stressScore, setStressScore]);

    useEffect(() => {
        const d = appState === 'CALM' ? 4200 : appState === 'STRESS' ? 2000 : 900;
        scale.value = withRepeat(
            withSequence(
                withTiming(1.28, { duration: d, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.92, { duration: d, easing: Easing.inOut(Easing.sin) }),
            ),
            -1, false,
        );
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(
                appState === 'CALM' ? Haptics.ImpactFeedbackStyle.Light :
                    appState === 'STRESS' ? Haptics.ImpactFeedbackStyle.Medium :
                        Haptics.ImpactFeedbackStyle.Heavy
            );
        }
    }, [appState]);

    const drag = Gesture.Pan()
        .onUpdate((e) => {
            'worklet';
            tx.value = e.translationX;
            ty.value = e.translationY;
            if (e.translationY > 60 && Math.abs(e.velocityY) < 600) {
                runOnJS(reduceStress)();
            }
        })
        .onEnd(() => {
            'worklet';
            tx.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
            ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
        });

    const orbColor = appState === 'CALM' ? THEME.colors.calm.primary :
        appState === 'STRESS' ? THEME.colors.stress.primary :
            THEME.colors.agitation.primary;
    const glowColor = appState === 'CALM' ? THEME.colors.calm.secondary :
        appState === 'STRESS' ? THEME.colors.stress.secondary :
            THEME.colors.agitation.secondary;
    const orbLabel = appState === 'CALM' ? 'Breathe' : appState === 'STRESS' ? 'Slow Down' : 'Regulate';

    const orbStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: tx.value }, { translateY: ty.value }],
    }));

    return (
        <GestureDetector gesture={drag}>
            <Animated.View style={[styles.orb, { backgroundColor: orbColor, shadowColor: glowColor }, orbStyle]}>
                <View style={styles.innerGlow} />
                <View style={[styles.innerRing, { borderColor: glowColor + '55' }]} />
                <Text style={styles.orbLabel}>{orbLabel}</Text>
                {appState !== 'CALM' && (
                    <Text style={styles.orbSublabel}>↓ drag to calm</Text>
                )}
            </Animated.View>
        </GestureDetector>
    );
};

// ─────────────────────────────────────────────────────
// CHAOS FIELD
// ─────────────────────────────────────────────────────
const Particle = React.memo(({ index, score, state }: { index: number; score: number; state: AppState }) => {
    const x = useSharedValue(Math.random() * width);
    const y = useSharedValue(Math.random() * height);
    const ps = useSharedValue(0.5 + Math.random());

    useEffect(() => {
        const speed = Math.max(600, 5000 - score * 40);
        x.value = withRepeat(withTiming(Math.random() * width, { duration: speed + index * 60 }), -1, true);
        y.value = withRepeat(withTiming(Math.random() * height, { duration: speed + index * 80 }), -1, true);
        ps.value = withRepeat(
            withSequence(withTiming(1.5, { duration: speed / 2 }), withTiming(0.3, { duration: speed / 2 })),
            -1, true
        );
    }, [score]);

    const baseColor = state === 'AGITATION' ? '#FF2266' : '#00E5FF';
    const size = 4 + (index % 5) * 5;
    const style = useAnimatedStyle(() => ({
        opacity: 0.1 + score / 250,
        transform: [{ translateX: x.value }, { translateY: y.value }, { scale: ps.value }],
    }));

    return (
        <Animated.View
            style={[styles.chaosParticle, { width: size, height: size, borderRadius: size / 2, backgroundColor: baseColor }, style]}
        />
    );
});

const ChaosField = () => {
    const score = useStressStore((s) => s.stressScore);
    const state = useStressStore((s) => s.appState);
    if (state === 'CALM') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[...Array(14)].map((_, i) => <Particle key={i} index={i} score={score} state={state} />)}
        </View>
    );
};

// ─────────────────────────────────────────────────────
// STRESS BAR
// ─────────────────────────────────────────────────────
const StressBar = ({ score }: { score: number }) => {
    const barWidth = useSharedValue(0);
    useEffect(() => { barWidth.value = withTiming(score / 100, { duration: 500 }); }, [score]);
    const style = useAnimatedStyle(() => ({
        flex: barWidth.value,
        backgroundColor: score < 30 ? '#00FFDD' : score < 60 ? '#FFB800' : '#FF4488',
    }));
    return (
        <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, style]} />
            <View style={{ flex: Math.max(0, 1 - score / 100) }} />
        </View>
    );
};

// ─────────────────────────────────────────────────────
// AI COACH INSIGHTS CARD
// Shows live empathy and metrics from the engine.
// ─────────────────────────────────────────────────────
const CoachInsightsCard = ({
    score,
    onChat
}: {
    score: number;
    onChat: () => void;
}) => {
    const insights = getLiveInsights(score);
    console.log('AI Coach Insights Rendered:', insights.status);

    return (
        <TouchableOpacity style={styles.coachCard} onPress={onChat}>
            <LinearGradient
                colors={['rgba(0,255,221,0.08)', 'rgba(0,100,255,0.05)']}
                style={styles.coachCardInner}
            >
                <View style={styles.coachCardHeader}>
                    <View style={styles.coachLiveRow}>
                        <View style={styles.coachLiveDot} />
                        <Text style={styles.coachLiveTxt}>AI COACH · {insights.status}</Text>
                    </View>
                    <Text style={styles.coachMetricTxt}>{insights.metric}</Text>
                </View>
                <Text style={styles.coachEmpathyTxt}>"{insights.empathy}"</Text>
                <View style={styles.coachFooter}>
                    <Text style={styles.coachChatLink}>Talk to Nerv →</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

// ─────────────────────────────────────────────────────
// AUTO-TRIGGER OVERLAY
// Fires automatically when sensors detect AGITATION.
// 60s cooldown prevents spam.
// ─────────────────────────────────────────────────────
const AutoTriggerOverlay = ({
    decision,
    onBegin,
    onDismiss,
}: {
    decision: CoachDecision;
    onBegin: () => void;
    onDismiss: () => void;
}) => {
    const slideY = useSharedValue(200);
    const bgOp = useSharedValue(0);
    const stressScore = useStressStore((s) => s.stressScore);

    useEffect(() => {
        bgOp.value = withTiming(1, { duration: 350 });
        slideY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.4)) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, []);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideY.value }],
    }));
    const dimStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }));

    const dismiss = () => {
        slideY.value = withTiming(300, { duration: 300 });
        bgOp.value = withTiming(0, { duration: 300 }, () => runOnJS(onDismiss)());
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Dim scrim */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }, dimStyle]}
                pointerEvents="auto"
            >
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} />
            </Animated.View>

            {/* Bottom sheet */}
            <Animated.View style={[styles.triggerSheet, sheetStyle]} pointerEvents="auto">
                <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
                    <LinearGradient colors={['#1E0010', '#2E0018']} style={StyleSheet.absoluteFill} />
                </View>

                {/* Pull indicator */}
                <View style={styles.triggerPill} />

                <Text style={styles.triggerEmoji}>
                    {decision.level === 3 ? '🚨' : decision.level === 2 ? '⚠️' : '⚡'}
                </Text>
                <Text style={styles.triggerTitle}>{decision.title}</Text>
                <Text style={styles.triggerBody}>
                    {decision.body}
                </Text>

                <View style={styles.triggerRow}>
                    <TouchableOpacity style={styles.triggerPrimary} onPress={onBegin}>
                        <Text style={styles.triggerPrimaryTxt}>🧘 {decision.cta}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.triggerSecondary} onPress={dismiss}>
                        <Text style={styles.triggerSecondaryTxt}>Not now</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

// ─────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────
interface Props { onNavigate: (s: AppScreen) => void; }

export const HomeScreen = ({ onNavigate }: Props) => {
    const stressScore = useStressStore((s) => s.stressScore);
    const appState = useStressStore((s) => s.appState);
    const isDemoMode = useStressStore((s) => s.isDemoMode);
    const toggleDemoMode = useStressStore((s) => s.toggleDemoMode);
    const setStressScore = useStressStore((s) => s.setStressScore);
    const setAppState = useStressStore((s) => s.setAppState);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [coachDecision, setCoachDecision] = useState<CoachDecision | null>(null);

    const setEmotionScore = useStressStore((s) => s.setEmotionScore);

    const lastOverlayTime = useRef<number>(0);
    const OVERLAY_COOLDOWN_MS = 60_000; // 60s between triggers
    useMotionListener();

    // ── AUTO-TRIGGER: AI Coach evaluates patterns ──
    useEffect(() => {
        if (appState === 'AGITATION') {
            recordSpike(stressScore);
        }

        const decision = evaluateIntervention(stressScore);
        if (decision.shouldIntervene) {
            const now = Date.now();
            if (now - lastOverlayTime.current < OVERLAY_COOLDOWN_MS) return;
            if (showOverlay || sidebarOpen) return;

            setCoachDecision(decision);
            lastOverlayTime.current = now;
            setShowOverlay(true);
        }
    }, [appState, stressScore]);

    const badgeColor =
        appState === 'CALM' ? THEME.colors.calm.primary :
            appState === 'STRESS' ? THEME.colors.stress.primary :
                THEME.colors.agitation.primary;

    const bg: [string, string] =
        appState === 'CALM' ? ['#001A2C', '#003333'] :
            appState === 'STRESS' ? ['#1A0E00', '#2E1800'] :
                ['#1E0010', '#3A0000'];

    const hint =
        appState === 'CALM'
            ? 'You are calm. Keep breathing.'
            : appState === 'STRESS'
                ? 'Elevated. Follow the orb rhythm.'
                : 'High agitation. Drag the orb downward slowly.';

    const lastTap = useRef(0);
    const onScreenTap = useCallback(() => {
        if (isDemoMode) return;
        const now = Date.now();
        if (now - lastTap.current < 400) setStressScore(stressScore + 3);
        lastTap.current = now;
    }, [isDemoMode, stressScore, setStressScore]);

    return (
        <LinearGradient colors={bg} style={styles.container}>
            <HiddenCamera onStressUpdate={setEmotionScore} />
            <ChaosField />

            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* ── HEADER ── */}
                    <View style={styles.header}>
                        {/* Hamburger */}
                        <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarOpen(true)}>
                            <View style={styles.hamburgerLine} />
                            <View style={[styles.hamburgerLine, { width: 16 }]} />
                            <View style={styles.hamburgerLine} />
                        </TouchableOpacity>

                        <View style={styles.headerCenter} pointerEvents="box-none">
                            <TouchableOpacity
                                activeOpacity={1}
                                style={{ alignItems: 'center' }}
                                onPress={() => {
                                    const now = Date.now();
                                    // @ts-ignore
                                    if (!window.titleTapCount) window.titleTapCount = 0;
                                    // @ts-ignore
                                    if (now - (window.lastTitleTap || 0) < 500) {
                                        // @ts-ignore
                                        window.titleTapCount++;
                                        // @ts-ignore
                                        if (window.titleTapCount >= 5) {
                                            useStressStore.getState().toggleDebug();
                                            // @ts-ignore
                                            window.titleTapCount = 0;
                                        }
                                    } else {
                                        // @ts-ignore
                                        window.titleTapCount = 1;
                                    }
                                    // @ts-ignore
                                    window.lastTitleTap = now;
                                }}
                            >
                                <Text style={[styles.appName, { color: '#FFFF00' }]}>NervSync</Text>
                                <Text style={styles.appTagline}>Regulator</Text>

                                {/* AI STATUS PILL */}
                                <View style={styles.aiStatusPill}>
                                    <View style={styles.aiPulseDot} />
                                    <Text style={styles.aiStatusText}>AI ACTIVE</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {useStressStore((s) => s.debugMode) && (
                            <View style={styles.debugOverlay} pointerEvents="none">
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <View style={[
                                        styles.debugHeartbeat,
                                        { backgroundColor: Date.now() % 2000 < 500 ? '#FF0055' : '#333' }
                                    ]} />
                                    <Text style={styles.debugText}>ML SENSOR ACTIVE</Text>
                                </View>
                                <Text style={styles.debugText}>Emotion Score: {Math.round(useStressStore.getState().emotionScore)}</Text>
                                <Text style={styles.debugText}>Motion Avg: {useStressStore.getState().movementIntensity.toFixed(2)}</Text>
                                <Text style={styles.debugText}>Unified Stress: {Math.round(useStressStore.getState().stressScore)}%</Text>
                            </View>
                        )}

                        <View style={[styles.badge, { borderColor: badgeColor }]}>
                            <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
                            <Text style={styles.badgeText}>{appState}</Text>
                        </View>
                    </View>

                    {/* ── ORB ── */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={onScreenTap}
                        style={styles.orbTouchable}
                    >
                        <BreathingOrb />
                    </TouchableOpacity>

                    {/* ── STATS ── */}
                    <View style={styles.statsSection}>
                        <Text style={styles.statLabel}>NERVOUS LOAD</Text>
                        <Text style={styles.statValue}>
                            {stressScore}<Text style={styles.percent}>%</Text>
                        </Text>
                        <StressBar score={stressScore} />
                        <Text style={styles.hintText}>{hint}</Text>
                    </View>

                    {/* ── AI COACH CARD ── */}
                    <CoachInsightsCard
                        score={stressScore}
                        onChat={() => onNavigate('COACH_CHAT')}
                    />

                    {/* ── MEDITATION CTA ── */}
                    <TouchableOpacity
                        style={styles.meditationCTA}
                        onPress={() => onNavigate('BASELINE_SCAN')}
                    >
                        <LinearGradient
                            colors={['rgba(0,200,180,0.18)', 'rgba(0,100,140,0.14)']}
                            style={styles.meditationCTAInner}
                        >
                            <Text style={styles.meditationCTAIcon}>🧘</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.meditationCTATitle}>Take a Meditation Session</Text>
                                <Text style={styles.meditationCTASub}>Baseline scan → Adaptive breath field</Text>
                            </View>
                            <Text style={styles.meditationCTAArrow}>→</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* ── DEMO ── */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.demoBtn} onPress={toggleDemoMode}>
                            <Text style={styles.demoBtnText}>
                                {isDemoMode ? '🔓  Manual Override ON' : '🔒  Live Sensor Mode'}
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
                </ScrollView>
            </SafeAreaView>

            {/* ── SIDEBAR ── */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onNavigate={onNavigate}
                appState={appState}
                stressScore={stressScore}
            />

            {/* ── AUTO-TRIGGER OVERLAY ── */}
            {showOverlay && coachDecision && (
                <AutoTriggerOverlay
                    decision={coachDecision}
                    onBegin={() => {
                        recordRecovery();
                        setShowOverlay(false);
                        onNavigate('BASELINE_SCAN');
                    }}
                    onDismiss={() => {
                        recordIgnoredPrompt();
                        setShowOverlay(false);
                    }}
                />
            )}
        </LinearGradient>
    );
};

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4,
        position: 'relative',
    },
    menuBtn: { width: 40, height: 40, justifyContent: 'center', gap: 5, paddingLeft: 2, zIndex: 10 },
    hamburgerLine: { height: 2, width: 22, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 2 },
    headerCenter: {
        position: 'absolute',
        left: 0, right: 0,
        top: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
    appTagline: { fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginTop: -2 },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999, borderWidth: 1.5,
        backgroundColor: 'rgba(255,255,255,0.07)',
        zIndex: 10,
    },
    badgeDot: { width: 7, height: 7, borderRadius: 4 },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

    // Orb
    orbTouchable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    orb: {
        width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
        elevation: 30, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 50,
    },
    innerGlow: {
        position: 'absolute', top: '10%', left: '10%',
        width: '38%', height: '38%', borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    innerRing: {
        position: 'absolute',
        width: ORB_SIZE * 0.75, height: ORB_SIZE * 0.75,
        borderRadius: ORB_SIZE * 0.375, borderWidth: 1,
    },
    orbLabel: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' },
    orbSublabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1, marginTop: 5 },

    // AI Coach Card
    coachCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,255,221,0.15)',
        overflow: 'hidden',
    },
    coachCardInner: {
        padding: 16,
    },
    coachCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    coachLiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coachLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FFDD',
        marginRight: 6,
    },
    coachLiveTxt: {
        color: '#00FFDD',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    coachMetricTxt: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '600',
    },
    coachEmpathyTxt: {
        color: '#FFF',
        fontSize: 15,
        fontStyle: 'italic',
        lineHeight: 22,
        opacity: 0.9,
    },
    coachFooter: {
        marginTop: 10,
        alignItems: 'flex-end',
    },
    coachChatLink: {
        color: 'rgba(0,255,221,0.6)',
        fontSize: 12,
        fontWeight: '700',
    },

    // Stats
    statsSection: { alignItems: 'center', paddingBottom: 8 },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
    statValue: { fontSize: 72, fontWeight: '100', color: '#FFF', lineHeight: 80 },
    percent: { fontSize: 32, fontWeight: '100', color: 'rgba(255,255,255,0.6)' },
    barTrack: {
        flexDirection: 'row', width: width * 0.55, height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', marginTop: 8,
    },
    barFill: { borderRadius: 99, minWidth: 4 },
    hintText: {
        color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center',
        marginTop: 12, paddingHorizontal: 20, lineHeight: 20,
    },

    // Meditation CTA
    meditationCTA: {
        marginHorizontal: 4, marginBottom: 12, borderRadius: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(0,200,200,0.3)',
    },
    meditationCTAInner: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14,
    },
    meditationCTAIcon: { fontSize: 28 },
    meditationCTATitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    meditationCTASub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    meditationCTAArrow: { color: 'rgba(255,255,255,0.5)', fontSize: 18 },

    // Demo
    footer: { alignItems: 'center', paddingBottom: 8 },
    demoBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 18, paddingVertical: 9,
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    demoBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
    demoRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    demoStateBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 8,
        borderRadius: 10, borderWidth: 1,
    },
    demoStateTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },

    // Particles
    chaosParticle: { position: 'absolute' },

    // Sidebar
    sidebarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    sidebarPanel: {
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: SIDEBAR_W,
        borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)',
    },
    sidebarSafe: { flex: 1, paddingHorizontal: 24 },
    sidebarProfile: {
        flexDirection: 'row', alignItems: 'center', paddingTop: 24, paddingBottom: 20,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    avatarRing: {
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 1.5, borderColor: 'rgba(0,255,200,0.4)',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,255,200,0.08)',
    },
    avatarEmoji: { fontSize: 24 },
    profileName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    profileBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
    profileBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

    sidebarStressBlock: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    sidebarStressLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
    sidebarStressValue: { color: '#FFF', fontSize: 36, fontWeight: '100', marginVertical: 4 },
    sidebarBar: {
        height: 3, backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 99, overflow: 'hidden',
    },
    sidebarBarFill: { height: 3, borderRadius: 99 },

    sidebarNav: { flex: 1, paddingTop: 20 },
    sidebarNavHeader: {
        color: 'rgba(255,255,255,0.3)', fontSize: 10,
        letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12,
    },
    sidebarItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 12, marginHorizontal: -12,
        borderRadius: 12, marginBottom: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    sidebarItemDisabled: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 12, marginHorizontal: -12,
        borderRadius: 12, marginBottom: 4, opacity: 0.35,
    },
    sidebarItemIcon: { fontSize: 22 },
    sidebarItemTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    sidebarItemSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
    sidebarFooter: {
        color: 'rgba(255,255,255,0.2)', fontSize: 11,
        textAlign: 'center', paddingBottom: 24,
    },

    // Auto-trigger overlay
    triggerSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 12, paddingBottom: 40, paddingHorizontal: 28,
        overflow: 'hidden',
        borderTopWidth: 1, borderColor: 'rgba(255,80,100,0.3)',
    },
    triggerPill: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center', marginBottom: 20,
    },
    triggerEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
    triggerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
    triggerBody: {
        color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center',
        lineHeight: 22, marginBottom: 28,
    },
    triggerRow: { gap: 10 },
    triggerPrimary: {
        backgroundColor: 'rgba(255,60,100,0.25)', paddingVertical: 16,
        borderRadius: 14, borderWidth: 1.5, borderColor: '#FF4488',
        alignItems: 'center',
    },
    triggerPrimaryTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    triggerSecondary: {
        paddingVertical: 12, borderRadius: 14,
        alignItems: 'center', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    triggerSecondaryTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
    debugOverlay: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF0055',
        zIndex: 9999,
    },
    aiStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: 'rgba(0, 255, 204, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(0, 255, 204, 0.25)',
    },
    aiPulseDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#00FFCC',
        marginRight: 5,
    },
    aiStatusText: {
        color: '#00FFCC',
        fontSize: 8,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 0.8,
        opacity: 0.9,
    },
    debugText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        marginBottom: 4,
    },
    debugHeartbeat: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
});
