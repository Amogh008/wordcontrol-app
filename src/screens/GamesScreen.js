import { localize, localizeFormat } from "../locales";import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getWords } from '../services/wordsService';
import GamesView from '../components/GamesView';
import { useLanguageProfile } from '../context/LanguageProfileContext';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function GamesScreen({ active }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const { activeProfile } = useLanguageProfile();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
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
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize('Games')}</Text>
        </Text>
        <Text style={styles.subtitle}>{localizeFormat("Test your {0}", [activeProfile?.englishName || 'German'])}</Text>
      </View>

      <View style={styles.body}>
        {loading && !hasLoaded.current ?
        <Text style={styles.loading}>{localize('Loading…')}</Text> :

        <GamesView words={words} />
        }
      </View>
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBg
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24
  },
  title: {
    fontSize: 30
  },
  titleBold: {
    fontFamily: titleFont,
    fontWeight: '700',
    color: '#fff'
  },
  titleItalic: {
    fontFamily: titleFont,
    fontStyle: 'italic',
    color: '#fff'
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#cfc9bd'
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  loading: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14
  }
});
