import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '@/src/screens/HomeScreen';
import { BaselineScanScreen } from '@/src/screens/BaselineScanScreen';
import { MeditationScreen } from '@/src/screens/MeditationScreen';
import { GameScreen } from '@/src/screens/GameScreen';
import { CoachChatScreen } from '@/src/screens/CoachChatScreen';
import { FocusShield } from '@/src/components/FocusShield';
import { useSensoryLoad } from '@/hooks/useSensoryLoad';

export type AppScreen = 'HOME' | 'BASELINE_SCAN' | 'MEDITATION' | 'GAME' | 'COACH_CHAT';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('HOME');
  const sensory = useSensoryLoad();

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        {screen === 'HOME' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'BASELINE_SCAN' && <BaselineScanScreen onNavigate={setScreen} />}
        {screen === 'MEDITATION' && <MeditationScreen onNavigate={setScreen} />}
        {screen === 'GAME' && <GameScreen onNavigate={setScreen} />}
        {screen === 'COACH_CHAT' && <CoachChatScreen onNavigate={setScreen} />}

        {/* Environmental Stress Radar — FocusShield overlay */}
        <FocusShield
          sensoryLoad={sensory.sensoryLoad}
          shouldTriggerShield={sensory.shouldTriggerShield}
          currentdB={sensory.currentdB}
          spikeCount={sensory.spikeCount}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

