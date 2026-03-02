import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { fromTexture } from '@tensorflow/tfjs-react-native';
import { MLProcessor } from '../logic/mlProcessor';

/**
 * HiddenCamera is an invisible component that captures camera frames 
 * using GLView and fromTexture directly, avoiding the legacy HOC.
 */
export const HiddenCamera = ({ onStressUpdate }: { onStressUpdate: (score: number) => void }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [isReady, setIsReady] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const glContextRef = useRef<ExpoWebGLRenderingContext | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await requestPermission();
            if (status === 'granted') {
                await MLProcessor.init();
                setIsReady(true);
            }
        })();
    }, []);

    const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
        glContextRef.current = gl;
        // In SDK 54, we might need a small delay for the camera to be ready
        // before we can create a texture from it.
    };

    const processFrame = async () => {
        if (!glContextRef.current || !cameraRef.current) return;

        const gl = glContextRef.current;

        try {
            // Check if context extension is available (only available on native)
            // @ts-ignore
            if (typeof gl.createCameraTextureAsync !== 'function') {
                return;
            }

            // @ts-ignore
            const texture = await gl.createCameraTextureAsync(cameraRef.current);
            if (!texture) return;

            const sourceDims = {
                width: 1280,
                height: 720,
                depth: 3
            };

            const targetShape = {
                width: 224,
                height: 224,
                depth: 3
            };

            const imageTensor = fromTexture(gl, texture, sourceDims, targetShape);

            if (imageTensor) {
                const score = await MLProcessor.detectStress(imageTensor);
                onStressUpdate(score);
                imageTensor.dispose();
            }

            gl.deleteTexture(texture);
        } catch (error) {
            // Silently handle background errors to avoid crashing the UI
        }
    };

    useEffect(() => {
        let interval: any;
        if (isReady) {
            interval = setInterval(processFrame, 2000); // 2 seconds between detections
        }
        return () => clearInterval(interval);
    }, [isReady]);

    if (!permission?.granted || !isReady) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
            />
            <GLView
                style={styles.glView}
                onContextCreate={onContextCreate}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
        zIndex: -1,
    },
    camera: {
        width: 1,
        height: 1,
    },
    glView: {
        width: 1,
        height: 1,
    },
});
