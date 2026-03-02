/**
 * FocusShield — Environmental Overload Protection Component
 *
 * When sensoryLoad > 60, shows a modal offering to activate Focus Shield.
 * If accepted: plays brown noise loop, simplifies UI via store flag, reduces animations.
 * If dismissed: continues monitoring only.
 *
 * Proper cleanup: stops brown noise on unmount/deactivation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity,
    Modal, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useStressStore } from '../store/useStressStore';

const { width, height } = Dimensions.get('window');

// Calm audio asset for Focus Shield
const SHIELD_AUDIO = require('../../assets/audio/calm_music.mp3');

interface FocusShieldProps {
    sensoryLoad: number;
    shouldTriggerShield: boolean;
    currentdB: number;
    spikeCount: number;
}

export function FocusShield({
    sensoryLoad,
    shouldTriggerShield,
    currentdB,
    spikeCount,
}: FocusShieldProps) {
    const [showModal, setShowModal] = useState(false);
    const [shieldActive, setShieldActive] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const pulseAnim = useRef(new Animated.Value(0.6)).current;
    const focusShieldEnabled = useStressStore((s) => s.focusShieldEnabled);
    const setFocusShield = useStressStore((s) => s.setFocusShield);

    // Trigger modal when sensoryLoad crosses threshold
    useEffect(() => {
        if (shouldTriggerShield && !shieldActive && !dismissed && !showModal) {
            setShowModal(true);
        }
    }, [shouldTriggerShield, shieldActive, dismissed, showModal]);

    // Reset dismissed flag when load drops back below threshold
    useEffect(() => {
        if (!shouldTriggerShield && dismissed) {
            setDismissed(false);
        }
    }, [shouldTriggerShield, dismissed]);

    // Pulse animation for active shield indicator
    useEffect(() => {
        if (!shieldActive) return;

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.6,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [shieldActive]);

    // Start brown noise loop
    const startBrownNoise = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });

            const { sound } = await Audio.Sound.createAsync(SHIELD_AUDIO, {
                isLooping: true,
                volume: 0.4,
                shouldPlay: true,
            });

            soundRef.current = sound;
        } catch (err) {
            console.warn('[FocusShield] Brown noise failed:', err);
        }
    }, []);

    // Stop brown noise
    const stopBrownNoise = useCallback(async () => {
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch {
                // already unloaded
            }
            soundRef.current = null;
        }
    }, []);

    // Activate Focus Shield
    const handleActivate = useCallback(async () => {
        setShowModal(false);
        setShieldActive(true);
        setFocusShield(true);
        await startBrownNoise();
    }, [startBrownNoise, setFocusShield]);

    // Dismiss modal
    const handleDismiss = useCallback(() => {
        setShowModal(false);
        setDismissed(true);
    }, []);

    // Deactivate Focus Shield
    const handleDeactivate = useCallback(async () => {
        setShieldActive(false);
        setFocusShield(false);
        await stopBrownNoise();
    }, [stopBrownNoise, setFocusShield]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBrownNoise();
        };
    }, []);

    return (
        <>
            {/* Trigger Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(0,13,26,0.95)', 'rgba(0,26,44,0.98)']}
                        style={styles.modalCard}
                    >
                        {/* Warning Icon */}
                        <View style={styles.iconContainer}>
                            <Text style={styles.warningIcon}>🛡️</Text>
                        </View>

                        <Text style={styles.modalTitle}>High Sensory Overload Detected</Text>

                        <Text style={styles.modalBody}>
                            Environmental noise level is at{' '}
                            <Text style={styles.highlight}>{currentdB}%</Text> with{' '}
                            <Text style={styles.highlight}>{spikeCount} spikes</Text> detected.
                            {'\n\n'}Sensory load:{' '}
                            <Text style={styles.highlightDanger}>{sensoryLoad}%</Text>
                        </Text>

                        <Text style={styles.modalSubtext}>
                            Activate Focus Shield to reduce sensory input?
                        </Text>

                        <TouchableOpacity
                            style={styles.activateBtn}
                            onPress={handleActivate}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#00FFDD', '#00DDBB']}
                                style={styles.activateBtnGradient}
                            >
                                <Text style={styles.activateBtnText}>🛡️ Activate Focus Shield</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dismissBtn}
                            onPress={handleDismiss}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dismissBtnText}>Continue Without Shield</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* Active Shield Indicator (floating pill) */}
            {shieldActive && (
                <Animated.View style={[styles.shieldPill, { opacity: pulseAnim }]}>
                    <TouchableOpacity
                        onPress={handleDeactivate}
                        style={styles.shieldPillTouch}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.shieldPillIcon}>🛡️</Text>
                        <View>
                            <Text style={styles.shieldPillText}>Focus Shield Active</Text>
                            <Text style={styles.shieldPillSub}>Tap to deactivate</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    modalCard: {
        width: width - 60,
        borderRadius: 28,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,255,221,0.2)',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0,255,221,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    warningIcon: {
        fontSize: 36,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalBody: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 8,
    },
    highlight: {
        color: '#00FFDD',
        fontWeight: '700',
    },
    highlightDanger: {
        color: '#FF6B6B',
        fontWeight: '800',
        fontSize: 17,
    },
    modalSubtext: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    activateBtn: {
        width: '100%',
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    activateBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 16,
    },
    activateBtnText: {
        color: '#000D1A',
        fontSize: 16,
        fontWeight: '800',
    },
    dismissBtn: {
        paddingVertical: 12,
    },
    dismissBtnText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },

    // Active pill
    shieldPill: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,255,221,0.15)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(0,255,221,0.3)',
        zIndex: 999,
    },
    shieldPillTouch: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        gap: 10,
    },
    shieldPillIcon: {
        fontSize: 20,
    },
    shieldPillText: {
        color: '#00FFDD',
        fontSize: 13,
        fontWeight: '700',
    },
    shieldPillSub: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
    },
});
