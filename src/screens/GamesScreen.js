import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getWords } from '../services/wordsService';
import GamesView from '../components/GamesView';
import SpeakingNetworkView from '../components/SpeakingNetworkView';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function GamesScreen({ active }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('games');
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    try {
      setWords(await getWords());
    } catch {
      if (!hasLoaded.current) setWords([]);
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  // Reload the word list every time the Games tab becomes active, so games
  // always play against the current vocabulary.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{isDe ? 'Meine ' : 'My '}</Text>
          <Text style={styles.titleItalic}>{isDe ? 'Spiele' : 'Games'}</Text>
        </Text>
        <Text style={styles.subtitle}>{isDe ? 'Teste dein Deutsch' : 'Test your German'}</Text>
      </View>

      <View style={styles.sectionTabs} accessibilityRole="tablist">
        <Pressable
          onPress={() => setSection('games')}
          style={[styles.sectionTab, section === 'games' && styles.sectionTabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'games' }}
        >
          <Text style={[styles.sectionTabText, section === 'games' && styles.sectionTabTextActive]}>
            {isDe ? 'Spiele' : 'Games'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSection('network')}
          style={[styles.sectionTab, section === 'network' && styles.sectionTabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'network' }}
        >
          <Text style={[styles.sectionTabText, section === 'network' && styles.sectionTabTextActive]}>
            {isDe ? 'Sprech-Netzwerk' : 'Speaking Network'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {section === 'network' ? (
          <SpeakingNetworkView onExit={() => setSection('games')} />
        ) : loading && !hasLoaded.current ? (
          <Text style={styles.loading}>{isDe ? 'Lädt…' : 'Loading…'}</Text>
        ) : (
          <GamesView words={words} />
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 30,
  },
  titleBold: {
    fontFamily: titleFont,
    fontWeight: '700',
    color: '#fff',
  },
  titleItalic: {
    fontFamily: titleFont,
    fontStyle: 'italic',
    color: '#fff',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#cfc9bd',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: colors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a4741',
  },
  sectionTabActive: {
    backgroundColor: '#bfeefa',
    borderColor: '#62d6ee',
  },
  sectionTabText: {
    color: '#cfc9bd',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTabTextActive: {
    color: '#155a6a',
  },
  loading: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
});
