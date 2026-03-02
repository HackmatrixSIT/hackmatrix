import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    useDerivedValue,
} from 'react-native-reanimated';
import { useStressStore } from '../store/useStressStore';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 15;

const Particle = ({ index }: { index: number }) => {
    const stressScore = useStressStore((state) => state.stressScore);

    const posX = useSharedValue(Math.random() * width);
    const posY = useSharedValue(Math.random() * height);
    const opacity = useSharedValue(Math.random() * 0.5);

    useEffect(() => {
        const animate = () => {
            // Particles move faster when stress is higher
            const duration = 5000 / (1 + (stressScore / 50));

            posX.value = withRepeat(
                withTiming(Math.random() * width, { duration, easing: Easing.linear }),
                -1,
                true
            );
            posY.value = withRepeat(
                withTiming(Math.random() * height, { duration, easing: Easing.linear }),
                -1,
                true
            );
        };
        animate();
    }, [stressScore]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: posX.value },
            { translateY: posY.value },
            { scale: 1 + (stressScore / 100) }
        ],
        opacity: 0.1 + (stressScore / 200),
        backgroundColor: stressScore > 60 ? '#FF00FF' : '#FFF',
    }));

    return <Animated.View style={[styles.particle, animatedStyle]} />;
};

export const ChaosField = () => {
    const appState = useStressStore((state) => state.appState);

    if (appState === 'CALM') return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[...Array(PARTICLE_COUNT)].map((_, i) => (
                <Particle key={i} index={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    particle: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        // Blur effect simulation via scale and opacity
    },
});
