import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WordControlScreen from './src/screens/WordControlScreen';
import TranslationScreen from './src/screens/TranslationScreen';
import GrammarScreen from './src/screens/GrammarScreen';
import NotesScreen from './src/screens/NotesScreen';
import GamesScreen from './src/screens/GamesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DictionaryScreen from './src/screens/DictionaryScreen';
import AuthScreen from './src/screens/AuthScreen';
import BottomBar from './src/components/BottomBar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';

function TabPanel({ active, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    scale.setValue(0.965);
    Animated.timing(scale, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, scale]);

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.tabPanel,
        {
          display: active ? 'flex' : 'none',
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function MainApp() {
  const [tab, setTab] = useState('words');
  const { colors } = useTheme();

  return (
    <View style={[styles.app, { backgroundColor: colors.pageBg }]}>
      <View style={[styles.tabContent, { backgroundColor: colors.pageBg }]}>
        <TabPanel active={tab === 'words'}>
          <WordControlScreen />
        </TabPanel>
        <TabPanel active={tab === 'translate'}>
          <TranslationScreen />
        </TabPanel>
        <TabPanel active={tab === 'dictionary'}>
          <DictionaryScreen />
        </TabPanel>
        <TabPanel active={tab === 'grammar'}>
          <GrammarScreen />
        </TabPanel>
        <TabPanel active={tab === 'notes'}>
          <NotesScreen />
        </TabPanel>
        <TabPanel active={tab === 'games'}>
          <GamesScreen active={tab === 'games'} />
        </TabPanel>
        <TabPanel active={tab === 'settings'}>
          <SettingsScreen />
        </TabPanel>
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
        <LanguageProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPanel: {
    ...StyleSheet.absoluteFillObject,
  },
});
