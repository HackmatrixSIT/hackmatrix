import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    StyleSheet, View, Text, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withRepeat, withSequence, withTiming, Easing, runOnJS,
    type SharedValue,
} from 'react-native-reanimated';

import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useStressStore } from '../store/useStressStore';
import type { AppScreen } from '../../app/(tabs)';
import { recordRecovery } from '../logic/aiCoach';

// Local calm meditation audio (bundled asset — works offline)
const CALM_MUSIC = require('../../assets/audio/calm_music.mp3');

// Volume per intensity level
const INTENSITY_VOLUME: Record<string, number> = {
    LOW: 0.35,
    MODERATE: 0.55,
    HIGH: 0.75,
};

// ── Audio hook ─────────────────────────────────────────
function useAmbientAudio(intensity: string, isMuted: boolean) {
    const soundRef = useRef<Audio.Sound | null>(null);
    const targetVol = isMuted ? 0 : (INTENSITY_VOLUME[intensity] ?? 0.4);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                const { sound } = await Audio.Sound.createAsync(
                    CALM_MUSIC,
                    { shouldPlay: !isMuted, isLooping: true, volume: 0 }
                );

                if (!mounted) { await sound.unloadAsync(); return; }
                soundRef.current = sound;

                // Fade in over 2s
                if (!isMuted) {
                    for (let v = 0; v <= targetVol; v += targetVol / 20) {
                        await sound.setVolumeAsync(Math.min(v, targetVol));
                        await new Promise((r) => setTimeout(r, 100));
                    }
                }
            } catch (e) {
                // Silently fail — audio is enhancement, not core
                console.warn('Audio load failed:', e);
            }
        };

        load();

        return () => {
            mounted = false;
            soundRef.current?.unloadAsync();
            soundRef.current = null;
        };
    }, []);

    // React to mute / volume changes
    useEffect(() => {
        const sound = soundRef.current;
        if (!sound) return;
        if (isMuted) {
            sound.setVolumeAsync(0);
            sound.pauseAsync();
        } else {
            sound.setVolumeAsync(targetVol);
            sound.playAsync();
        }
    }, [isMuted, targetVol]);
}
const { width, height } = Dimensions.get('window');

// ── Breath timings per intensity ──────────────────────
const RHYTHM = {
    LOW: { inhale: 4500, exhale: 5500, label: 'Ocean Breath', color: '#00CED1' },
    MODERATE: { inhale: 3500, exhale: 4500, label: 'Paced Breath', color: '#FFB800' },
    HIGH: { inhale: 2800, exhale: 3800, label: 'Ground Breath', color: '#FF4488' },
};

// ── Breath Field Ring ─────────────────────────────────
const BreathRing = ({
    index, breathScale, color,
}: {
    index: number; breathScale: SharedValue<number>; color: string;
}) => {
    const delay = index * 0.06;
    const baseSize = width * (0.35 + index * 0.09);

    const style = useAnimatedStyle(() => {
        const s = 0.85 + (breathScale.value - 0.85) * (1 - delay);
        return {
            transform: [{ scale: s }],
            opacity: 0.55 - index * 0.08,
        };
    });

    return (
        <Animated.View
            style={[
                styles.breathRing,
                {
                    width: baseSize, height: baseSize,
                    borderRadius: baseSize / 2,
                    borderColor: color,
                },
                style,
            ]}
        />
    );
};

// ── Floating Particle ─────────────────────────────────
const BreathParticle = ({
    index, breathScale, color, isDisturbed,
}: {
    index: number;
    breathScale: SharedValue<number>;
    color: string;
    isDisturbed: SharedValue<number>;
}) => {
    const angle = (index / 20) * Math.PI * 2;
    const baseR = width * 0.27;
    const px = useSharedValue(Math.cos(angle) * baseR);
    const py = useSharedValue(Math.sin(angle) * baseR);
    const s = useSharedValue(1);

    const style = useAnimatedStyle(() => {
        const r = baseR * breathScale.value;
        const jitter = isDisturbed.value * (Math.random() - 0.5) * 18;
        return {
            transform: [
                { translateX: Math.cos(angle) * r + jitter },
                { translateY: Math.sin(angle) * r + jitter },
                { scale: s.value * (0.6 + breathScale.value * 0.5) },
            ],
            opacity: 0.6 + breathScale.value * 0.4 - isDisturbed.value * 0.3,
        };
    });

    const size = 4 + (index % 3) * 3;
    return (
        <Animated.View
            style={[
                styles.particle,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
                style,
            ]}
        />
    );
};

// ── Main Screen ───────────────────────────────────────
interface Props { onNavigate: (s: AppScreen) => void; }

export const MeditationScreen = ({ onNavigate }: Props) => {
    const baselineIntensity = useStressStore((s) => s.baselineIntensity);
    const liveScore = useStressStore((s) => s.stressScore);
    const rhythm = RHYTHM[baselineIntensity];

    // Keep a ref so the breath cycle worklet always reads fresh score
    const liveScoreRef = useRef(liveScore);
    liveScoreRef.current = liveScore;

    // Dynamic timing: each cycle recalculates from live score
    // Higher stress → longer exhale (forces them to slow down)
    const getDynamicRhythm = useCallback(() => {
        const s = liveScoreRef.current;
        if (s >= 75) return { inhale: 4000, exhale: 7000 }; // High: breathe them slow
        if (s >= 50) return { inhale: 3500, exhale: 5500 }; // Moderate
        if (s >= 25) return { inhale: 3000, exhale: 4500 }; // Calming
        return { inhale: rhythm.inhale, exhale: rhythm.exhale }; // Calm: use baseline
    }, [rhythm]);

    const [phase, setPhase] = useState<'INHALE' | 'EXHALE'>('INHALE');
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [fingerActive, setFingerActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // 🎵 Ambient audio (plays & adapts automatically)
    useAmbientAudio(baselineIntensity, isMuted);

    // Reanimated shared values
    const breathScale = useSharedValue(0.9);
    const isDisturbed = useSharedValue(0);
    const fingerX = useSharedValue(0);
    const fingerY = useSharedValue(0);
    const bgOpacity = useSharedValue(0);

    // Fade in
    useEffect(() => {
        bgOpacity.value = withTiming(1, { duration: 800 });
    }, []);

    // Breath cycle — adapts timing EVERY cycle from live score
    const startBreath = useCallback(() => {
        const cycle = () => {
            const { inhale, exhale } = getDynamicRhythm();
            setPhase('INHALE');
            breathScale.value = withTiming(1.35, {
                duration: inhale,
                easing: Easing.inOut(Easing.sin),
            }, () => {
                runOnJS(setPhase)('EXHALE');
                breathScale.value = withTiming(0.82, {
                    duration: exhale,
                    easing: Easing.inOut(Easing.sin),
                }, () => {
                    runOnJS(cycle)();
                });
            });
        };
        cycle();
    }, [getDynamicRhythm]);

    useEffect(() => {
        startBreath();
        recordRecovery();
    }, []);

    // Haptic rhythm — also reads live score for intensity
    useEffect(() => {
        const s = liveScoreRef.current;
        const hapticStyle =
            s >= 60 ? Haptics.ImpactFeedbackStyle.Heavy :
                s >= 30 ? Haptics.ImpactFeedbackStyle.Medium :
                    Haptics.ImpactFeedbackStyle.Light;
        const { inhale, exhale } = getDynamicRhythm();

        const interval = setInterval(() => {
            Haptics.impactAsync(hapticStyle);
        }, phase === 'INHALE' ? inhale : exhale);

        Haptics.impactAsync(hapticStyle);
        return () => clearInterval(interval);
    }, [phase]);


    // Session timer
    useEffect(() => {
        const t = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, []);

    // Finger tracking gesture
    const setFingerDown = useCallback(() => setFingerActive(true), []);
    const setFingerUp = useCallback(() => { setFingerActive(false); isDisturbed.value = withTiming(0, { duration: 600 }); }, []);

    const fingerGesture = Gesture.Pan()
        .onBegin(() => { 'worklet'; runOnJS(setFingerDown)(); })
        .onUpdate((e) => {
            'worklet';
            fingerX.value = e.x;
            fingerY.value = e.y;
            const speed = Math.sqrt(e.velocityX ** 2 + e.velocityY ** 2);
            // Fast finger movement disturbs the field
            isDisturbed.value = Math.min(1, speed / 1200);
        })
        .onEnd(() => { 'worklet'; runOnJS(setFingerUp)(); });

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const containerStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

    const centerText =
        phase === 'INHALE' ? 'Inhale' : 'Exhale';

    const phaseColor = phase === 'INHALE'
        ? rhythm.color
        : rhythm.color + 'AA';

    return (
        <Animated.View style={[{ flex: 1 }, containerStyle]}>
            <LinearGradient
                colors={['#000508', '#000D14', '#001020']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safe}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onNavigate('HOME')} style={styles.backBtn}>
                        <Text style={styles.backText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{rhythm.label}</Text>
                        <Text style={styles.headerIntensity}>{baselineIntensity} INTENSITY</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setIsMuted((m) => !m)} style={styles.muteBtn}>
                            <Text style={styles.muteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.timer}>{formatTime(sessionSeconds)}</Text>
                    </View>
                </View>

                {/* Breath Field */}
                <GestureDetector gesture={fingerGesture}>
                    <View style={styles.fieldContainer}>
                        {/* Rings */}
                        {[...Array(5)].map((_, i) => (
                            <BreathRing key={i} index={i} breathScale={breathScale} color={rhythm.color} />
                        ))}

                        {/* Particle ring */}
                        {[...Array(20)].map((_, i) => (
                            <BreathParticle
                                key={i} index={i}
                                breathScale={breathScale}
                                color={rhythm.color}
                                isDisturbed={isDisturbed}
                            />
                        ))}

                        {/* Centre label */}
                        <View style={styles.centerLabel}>
                            <Text style={[styles.phaseText, { color: phaseColor }]}>{centerText}</Text>
                            <Text style={styles.fingerHint}>
                                {fingerActive ? '👆 Steady…' : 'Place finger to sync'}
                            </Text>
                        </View>
                    </View>
                </GestureDetector>

                {/* Bottom guide */}
                <View style={styles.footer}>
                    <View style={styles.rhythmBar}>
                        <View style={[styles.rhythmFill, {
                            backgroundColor: rhythm.color,
                            flex: phase === 'INHALE' ? rhythm.inhale : rhythm.exhale,
                        }]} />
                    </View>
                    <Text style={styles.footerTip}>
                        {baselineIntensity === 'LOW'
                            ? 'Gentle ocean breathing. Follow the sphere.'
                            : baselineIntensity === 'MODERATE'
                                ? 'Keep your finger steady on the field.'
                                : 'Grounding mode. Breathe slower than the sphere.'}
                    </Text>
                </View>

            </SafeAreaView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 12, paddingBottom: 4,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    backText: { color: 'rgba(255,255,255,0.6)', fontSize: 20 },
    headerCenter: { alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    headerIntensity: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, marginTop: 2 },
    headerRight: { alignItems: 'flex-end', gap: 2 },
    muteBtn: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center' },
    muteIcon: { fontSize: 18 },
    timer: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '300', textAlign: 'right' },

    fieldContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
    },

    breathRing: {
        position: 'absolute',
        borderWidth: 1.5,
    },

    particle: { position: 'absolute' },

    centerLabel: { alignItems: 'center', zIndex: 10 },
    phaseText: {
        fontSize: 36, fontWeight: '200', letterSpacing: 6, textTransform: 'uppercase',
    },
    fingerHint: {
        color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 10,
        letterSpacing: 1,
    },

    footer: { paddingBottom: 28, alignItems: 'center' },
    rhythmBar: {
        width: width * 0.6, height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 99, flexDirection: 'row', overflow: 'hidden', marginBottom: 16,
    },
    rhythmFill: { height: 3, borderRadius: 99 },
    footerTip: {
        color: 'rgba(255,255,255,0.45)', fontSize: 13,
        textAlign: 'center', paddingHorizontal: 20, lineHeight: 20,
    },
});
