import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withSequence, withRepeat, Easing, runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStressStore } from '../store/useStressStore';
import type { AppScreen } from '../../app/(tabs)';
import { recordRecovery } from '../logic/aiCoach';

const { width, height } = Dimensions.get('window');

// ─── Bubble config per intensity ─────────────────────
const CONFIG = {
    LOW: { colors: ['#00FFDD', '#00B4CC', '#0088AA'], minR: 28, maxR: 52, speed: 9000, popReward: 1, label: 'Drift Mode' },
    MODERATE: { colors: ['#FFB800', '#FF8C00', '#FFD700'], minR: 22, maxR: 42, speed: 6500, popReward: 1, label: 'Focus Mode' },
    HIGH: { colors: ['#FF4488', '#FF2255', '#CC0044'], minR: 18, maxR: 34, speed: 4500, popReward: 2, label: 'Release Mode' },
};

let _id = 0;
const newId = () => ++_id;

interface BubbleData {
    id: number;
    x: number;
    y: number;
    radius: number;
    color: string;
    targetX: number;
    targetY: number;
    lifetime: number; // ms
}

// ─── Single Bubble Component ──────────────────────────
const Bubble = ({
    data,
    onPop,
    onExpire,
    speed,
}: {
    data: BubbleData;
    onPop: (id: number) => void;
    onExpire: (id: number) => void;
    speed: number;
}) => {
    const x = useSharedValue(data.x);
    const y = useSharedValue(data.y);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(1);
    const alive = useRef(true);

    // Pop handler (must be stable for runOnJS)
    const pop = useCallback(() => {
        if (!alive.current) return;
        alive.current = false;
        onPop(data.id);
    }, [data.id, onPop]);

    const expire = useCallback(() => {
        if (!alive.current) return;
        alive.current = false;
        onExpire(data.id);
    }, [data.id, onExpire]);

    // Spawn + drift
    useEffect(() => {
        // Spawn
        scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });

        // Drift towards target
        x.value = withTiming(data.targetX, { duration: speed, easing: Easing.inOut(Easing.sin) });
        y.value = withTiming(data.targetY, { duration: speed, easing: Easing.inOut(Easing.sin) });

        // Lifetime fade-out
        const timer = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 600 }, () => runOnJS(expire)());
            scale.value = withTiming(0.3, { duration: 600 });
        }, data.lifetime);

        return () => clearTimeout(timer);
    }, []);

    const tapGesture = Gesture.Tap().onEnd(() => {
        'worklet';
        if (!alive.current) return;

        // Pop animation
        scale.value = withSequence(
            withTiming(1.45, { duration: 130, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
        );
        opacity.value = withTiming(0, { duration: 300 });

        runOnJS(pop)();
    });

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value - data.radius },
            { translateY: y.value - data.radius },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const d = data.radius * 2;
    return (
        <GestureDetector gesture={tapGesture}>
            <Animated.View
                style={[
                    styles.bubble,
                    {
                        width: d, height: d, borderRadius: data.radius,
                        backgroundColor: data.color + '33',
                        borderColor: data.color,
                        shadowColor: data.color,
                    },
                    style,
                ]}
            >
                {/* Glare highlight */}
                <View style={[styles.glare, { width: data.radius * 0.5, height: data.radius * 0.35 }]} />
            </Animated.View>
        </GestureDetector>
    );
};

// ─── Game Screen ──────────────────────────────────────
interface Props { onNavigate: (s: AppScreen) => void; }

export const GameScreen = ({ onNavigate }: Props) => {
    const baselineIntensity = useStressStore((s) => s.baselineIntensity);
    const stressScore = useStressStore((s) => s.stressScore); // used for display only
    const setStressScore = useStressStore((s) => s.setStressScore);
    const cfg = CONFIG[baselineIntensity];

    const [bubbles, setBubbles] = useState<BubbleData[]>([]);
    const [score, setScore] = useState(0);
    const [sessionSec, setSession] = useState(0);

    // ── helpers ──
    const spawnBubble = useCallback((): BubbleData => {
        const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
        const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
        const margin = r + 20;
        return {
            id: newId(),
            x: margin + Math.random() * (width - margin * 2),
            y: margin + Math.random() * (height - margin * 2),
            targetX: margin + Math.random() * (width - margin * 2),
            targetY: margin + Math.random() * (height - margin * 2),
            radius: r,
            color,
            lifetime: 5000 + Math.random() * 4000,
        };
    }, [cfg]);

    const removeBubble = useCallback((id: number) => {
        setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, []);

    const handlePop = useCallback((id: number) => {
        removeBubble(id);
        setScore((s) => s + 1);
        // Read fresh score from store to avoid stale closure on rapid pops
        const current = useStressStore.getState().stressScore;
        setStressScore(current - cfg.popReward);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [removeBubble, setStressScore, cfg.popReward]);

    const handleExpire = useCallback((id: number) => {
        removeBubble(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [removeBubble]);

    // ── Spawner ──
    useEffect(() => {
        // Initial population
        setBubbles([...Array(6)].map(() => spawnBubble()));
        recordRecovery();

        const spawner = setInterval(() => {
            setBubbles((prev) => {
                if (prev.length >= 9) return prev;
                return [...prev, spawnBubble()];
            });
        }, 1800);

        return () => clearInterval(spawner);
    }, [spawnBubble]);

    // ── Session timer ──
    useEffect(() => {
        const t = setInterval(() => setSession((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const scoreColor =
        baselineIntensity === 'LOW' ? '#00FFDD' :
            baselineIntensity === 'MODERATE' ? '#FFB800' : '#FF4488';

    return (
        <LinearGradient colors={['#000508', '#000D18', '#000820']} style={styles.container}>
            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onNavigate('HOME')} style={styles.backBtn}>
                        <Text style={styles.backTxt}>✕</Text>
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>Bubble Burst</Text>
                        <Text style={styles.subtitle}>{cfg.label} · Pop to release stress</Text>
                    </View>

                    <Text style={styles.timer}>{formatTime(sessionSec)}</Text>
                </View>

                {/* Score strip */}
                <View style={styles.scoreRow}>
                    <View style={styles.scoreChip}>
                        <Text style={styles.scoreLabel}>POPPED</Text>
                        <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
                    </View>
                    <View style={styles.scoreChip}>
                        <Text style={styles.scoreLabel}>NERVOUS LOAD</Text>
                        <Text style={[styles.scoreValue, { color: scoreColor }]}>{stressScore}%</Text>
                    </View>
                    <View style={styles.scoreChip}>
                        <Text style={styles.scoreLabel}>REWARD</Text>
                        <Text style={[styles.scoreValue, { color: scoreColor }]}>−{cfg.popReward}% / pop</Text>
                    </View>
                </View>

                {/* Bubble field */}
                <View style={styles.field} pointerEvents="box-none">
                    {bubbles.map((b) => (
                        <Bubble
                            key={b.id}
                            data={b}
                            onPop={handlePop}
                            onExpire={handleExpire}
                            speed={cfg.speed}
                        />
                    ))}

                    {/* Hint when brand new */}
                    {score === 0 && (
                        <View style={styles.hintBlock} pointerEvents="none">
                            <Text style={styles.hintEmoji}>🫧</Text>
                            <Text style={styles.hintText}>Tap the bubbles to pop them</Text>
                            <Text style={styles.hintSub}>Each pop calms your nervous system</Text>
                        </View>
                    )}
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6,
    },
    backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    backTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 18 },
    headerCenter: { alignItems: 'center' },
    title: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5, marginTop: 2 },
    timer: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '300', minWidth: 38, textAlign: 'right' },

    scoreRow: {
        flexDirection: 'row', justifyContent: 'space-around',
        marginHorizontal: 16, marginBottom: 4,
        paddingVertical: 10, paddingHorizontal: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    scoreChip: { alignItems: 'center' },
    scoreLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
    scoreValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },

    field: { flex: 1, position: 'relative' },

    bubble: {
        position: 'absolute',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 8,
        elevation: 12,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 20,
    },
    glare: {
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 99,
    },

    hintBlock: {
        position: 'absolute', alignSelf: 'center',
        top: '38%', alignItems: 'center',
    },
    hintEmoji: { fontSize: 52, marginBottom: 12 },
    hintText: { color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '600' },
    hintSub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 },
});
