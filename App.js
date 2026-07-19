import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WordControlScreen from './src/screens/WordControlScreen';
import TranslationScreen from './src/screens/TranslationScreen';
import GrammarScreen from './src/screens/GrammarScreen';
import NotesScreen from './src/screens/NotesScreen';
import GamesScreen from './src/screens/GamesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';
import BottomBar from './src/components/BottomBar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function MainApp() {
  const [tab, setTab] = useState('words');

  return (
    <View style={{ flex: 1 }}>
      {/* Both screens stay mounted so the Wörterbuch keeps its state when you
          switch tabs; the inactive one is just hidden. */}
      <View style={{ flex: 1, display: tab === 'words' ? 'flex' : 'none' }}>
        <WordControlScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'translate' ? 'flex' : 'none' }}>
        <TranslationScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'grammar' ? 'flex' : 'none' }}>
        <GrammarScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'notes' ? 'flex' : 'none' }}>
        <NotesScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'games' ? 'flex' : 'none' }}>
        <GamesScreen active={tab === 'games'} />
      </View>
      <View style={{ flex: 1, display: tab === 'settings' ? 'flex' : 'none' }}>
        <SettingsScreen />
      </View>
      <BottomBar tab={tab} onChange={setTab} />
    </View>
  );
}

function Root() {
  const { user, initializing } = useAuth();
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg }}>
        <ActivityIndicator color={colors.textDark} />
      </View>
    );
  }

  return (
    <>
      {user ? <MainApp /> : <AuthScreen />}
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
