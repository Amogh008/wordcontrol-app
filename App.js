import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WordControlScreen from './src/screens/WordControlScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <WordControlScreen />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
