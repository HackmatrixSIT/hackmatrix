import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolateColor,
    useDerivedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useStressStore } from '../store/useStressStore';
import { THEME } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.6;

export const BreathingOrb = () => {
    const { stressScore, appState, setStressScore } = useStressStore();

    // Shared values for animation
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const breathLabelOpacity = useSharedValue(0);

    // Dynamic breathing duration (Higher stress = faster pulse)
    const breathingDuration = useDerivedValue(() => {
        if (appState === 'CALM') return 4000;
        if (appState === 'STRESS') return 2500;
        return 1200; // Agitated rapid breathing
    });

    const breathLabel = useDerivedValue(() => {
        return scale.value > 1.15 ? 'Exhale' : 'Inhale';
    });

    // Start the pulse animation
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: breathingDuration.value, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
                withTiming(1.0, { duration: breathingDuration.value, easing: Easing.bezier(0.4, 0, 0.2, 1) })
            ),
            -1, // Loop forever
            true // Reverse
        );

        breathLabelOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: breathingDuration.value }),
                withTiming(0.3, { duration: breathingDuration.value })
            ),
            -1,
            true
        );

        // Haptic pulse at peaks
        const interval = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, breathingDuration.value);

        return () => clearInterval(interval);
    }, [appState]);

    // Handle Drag Gesture
    const dragGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;

            // Feature: Dragging the orb down slowly reduces stress
            if (event.translationY > 50 && event.velocityY < 500) {
                setStressScore(stressScore - 0.5);
            }
        })
        .onEnd(() => {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
        });

    // Animated Styles
    const animatedOrbStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            stressScore,
            [0, 50, 100],
            [THEME.colors.calm.primary, THEME.colors.stress.primary, THEME.colors.agitation.primary]
        );

        return {
            transform: [
                { scale: scale.value },
                { translateX: translateX.value },
                { translateY: translateY.value }
            ],
            backgroundColor: color,
            shadowColor: color,
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: breathLabelOpacity.value,
        transform: [{ translateY: scale.value * 20 }]
    }));

    return (
        <View style={styles.container}>
            <GestureDetector gesture={dragGesture}>
                <Animated.View style={[styles.orb, animatedOrbStyle]}>
                    <View style={styles.innerGlow} />
                    <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                        <Animated.Text style={styles.breatheText}>{breathLabel.value}</Animated.Text>
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    orb: {
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: ORB_SIZE / 2,
        elevation: 20,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerGlow: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '30%',
        height: '30%',
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    textContainer: {
        position: 'absolute',
    },
    breatheText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 4,
        textAlign: 'center',
    }
});
