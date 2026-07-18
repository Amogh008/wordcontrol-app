import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WordControlScreen from './src/screens/WordControlScreen';
import GamesScreen from './src/screens/GamesScreen';
import BottomBar from './src/components/BottomBar';

export default function App() {
  const [tab, setTab] = useState('words');

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {/* Both screens stay mounted so the Wörterbuch keeps its state when you
            switch tabs; the inactive one is just hidden. */}
        <View style={{ flex: 1, display: tab === 'words' ? 'flex' : 'none' }}>
          <WordControlScreen />
        </View>
        <View style={{ flex: 1, display: tab === 'games' ? 'flex' : 'none' }}>
          <GamesScreen active={tab === 'games'} />
        </View>
        <BottomBar tab={tab} onChange={setTab} />
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
