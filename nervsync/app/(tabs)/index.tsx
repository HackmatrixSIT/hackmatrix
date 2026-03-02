import { HomeScreen } from '@/src/screens/HomeScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function App() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <HomeScreen />
    </GestureHandlerRootView>
  );
}
