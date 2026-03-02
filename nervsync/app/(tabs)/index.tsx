import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '@/src/screens/HomeScreen';
import { BaselineScanScreen } from '@/src/screens/BaselineScanScreen';
import { MeditationScreen } from '@/src/screens/MeditationScreen';

export type AppScreen = 'HOME' | 'BASELINE_SCAN' | 'MEDITATION';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('HOME');

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        {screen === 'HOME' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'BASELINE_SCAN' && <BaselineScanScreen onNavigate={setScreen} />}
        {screen === 'MEDITATION' && <MeditationScreen onNavigate={setScreen} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
