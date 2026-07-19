import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getWords } from '../services/wordsService';
import GamesView from '../components/GamesView';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function GamesScreen({ active }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWords(await getWords());
    } catch {
      setWords([]);
    } finally {
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
          <Text style={styles.titleBold}>Meine </Text>
          <Text style={styles.titleItalic}>Spiele</Text>
        </Text>
        <Text style={styles.subtitle}>Teste dein Deutsch</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <Text style={styles.loading}>Lädt…</Text>
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
  loading: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
});
