import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getDictionaryEntry, searchDictionary } from '../services/dictionaryService';
import ReadAloudButton from '../components/ReadAloudButton';

function Section({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DictionaryScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [entry, setEntry] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const suppressNextSearch = useRef(false);
  const isNoun = Boolean(entry?.article)
    || /^(substantiv|nomen)\b/i.test(entry?.partOfSpeech ?? '');
  const plural = entry?.plural
    || entry?.forms?.find((form) => /plural/i.test(form.label))?.value
    || '';
  const grammarSections = entry?.grammarSections?.length
    ? entry.grammarSections
    : (!isNoun && entry?.forms?.length
      ? [{ title: 'Grammatische Formen', forms: entry.forms }]
      : []);

  useEffect(() => {
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return undefined;
    }
    const value = query.trim();
    requestId.current += 1;
    const id = requestId.current;
    setEntry(null);
    setError('');
    if (value.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const words = await searchDictionary(value);
        if (requestId.current === id) setResults(words);
      } catch (err) {
        if (requestId.current === id) {
          setError(err.response?.data?.error ?? err.message ?? 'Suche fehlgeschlagen.');
        }
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selectWord = async (word) => {
    requestId.current += 1;
    const id = requestId.current;
    suppressNextSearch.current = true;
    setQuery(word);
    setResults([]);
    setEntry(null);
    setError('');
    setSearching(false);
    setLoadingEntry(true);
    try {
      const nextEntry = await getDictionaryEntry(word);
      if (requestId.current === id) setEntry(nextEntry);
    } catch (err) {
      if (requestId.current === id) {
        setError(err.response?.data?.error ?? err.message ?? 'Eintrag konnte nicht geladen werden.');
      }
    } finally {
      if (requestId.current === id) setLoadingEntry(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Dictionary</Text>
        <Text style={styles.subtitle}>{isDe ? '1,6 Millionen deutsche Wortformen' : '1.6 million German word forms'}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={isDe ? 'Deutsches Wort suchen…' : 'Search for a German word…'}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching ? <ActivityIndicator size="small" color={colors.misc.text} /> : null}
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 && !entry ? (
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.map((word) => (
            <Pressable key={word} style={styles.resultRow} onPress={() => selectWord(word)}>
              <Text style={styles.resultText}>{word}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {loadingEntry ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.misc.text} />
          <Text style={styles.loadingText}>{isDe ? 'Wörterbucheintrag wird erstellt…' : 'Creating dictionary entry…'}</Text>
        </View>
      ) : error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : entry ? (
        <ScrollView contentContainerStyle={styles.entryBody}>
          <View style={styles.wordHeader}>
            <View style={styles.wordTitleRow}>
              <Text style={styles.word}>
                {entry.article ? `${entry.article} ` : ''}{entry.lemma}
              </Text>
              <ReadAloudButton
                text={entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma}
                language="de-DE"
                compact
              />
            </View>
            <Text style={styles.partOfSpeech}>{entry.partOfSpeech}</Text>
            {entry.word !== entry.lemma ? (
              <Text style={styles.queriedForm}>{isDe ? 'Gesuchte Form' : 'Searched form'}: {entry.word}</Text>
            ) : null}
          </View>

          <Section title={isDe ? 'BEDEUTUNGEN' : 'MEANINGS'} styles={styles}>
            {entry.meanings.map((meaning, index) => (
              <View key={`${meaning.english}-${index}`} style={styles.meaningRow}>
                <Text style={styles.meaningNumber}>{index + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.meaningEnglish}>{meaning.english}</Text>
                  <Text style={styles.definition}>{meaning.germanDefinition}</Text>
                </View>
              </View>
            ))}
          </Section>

          {isNoun && plural ? (
            <Section title={isDe ? 'PLURAL' : 'PLURAL'} styles={styles}>
              <View style={styles.formsGrid}>
                <View style={styles.formCard}>
                  <Text style={styles.formLabel}>{isDe ? 'Pluralform' : 'Plural form'}</Text>
                  <Text style={styles.formValue}>{plural}</Text>
                </View>
              </View>
            </Section>
          ) : null}

          {!isNoun ? grammarSections.map((grammarSection, sectionIndex) => (
            <Section
              key={`${grammarSection.title}-${sectionIndex}`}
              title={(grammarSection.title || (isDe ? 'GRAMMATISCHE FORMEN' : 'GRAMMATICAL FORMS')).toLocaleUpperCase(isDe ? 'de-DE' : 'en-US')}
              styles={styles}
            >
              <View style={styles.grammarTable}>
                {grammarSection.forms?.map((form, formIndex) => (
                  <View
                    key={`${form.label}-${form.value}-${formIndex}`}
                    style={[
                      styles.grammarRow,
                      formIndex === grammarSection.forms.length - 1 && styles.grammarRowLast,
                    ]}
                  >
                    <Text style={styles.grammarLabel}>{form.label}</Text>
                    <Text style={styles.grammarValue}>{form.value}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )) : null}

          <Section title={isDe ? 'BEISPIELSÄTZE' : 'EXAMPLE SENTENCES'} styles={styles}>
            {entry.examples?.map((example, index) => (
              <View key={`${example.german}-${index}`} style={styles.exampleCard}>
                <View style={styles.exampleGermanRow}>
                  <Text style={styles.exampleGerman}>{example.german}</Text>
                  <ReadAloudButton text={example.german} language="de-DE" compact />
                </View>
                <Text style={styles.exampleEnglish}>{example.english}</Text>
              </View>
            ))}
          </Section>

          {entry.usageNotes?.length ? (
            <Section title={isDe ? 'HINWEISE' : 'NOTES'} styles={styles}>
              {entry.usageNotes.map((note) => (
                <Text key={note} style={styles.note}>• {note}</Text>
              ))}
            </Section>
          ) : null}

          {entry.relatedWords?.length ? (
            <Section title={isDe ? 'VERWANDTE WÖRTER' : 'RELATED WORDS'} styles={styles}>
              <View style={styles.relatedWrap}>
                {entry.relatedWords.map((word) => (
                  <Pressable key={word} style={styles.relatedChip} onPress={() => selectWord(word)}>
                    <Text style={styles.relatedText}>{word}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}
          <Text style={styles.aiNotice}>{isDe ? 'Linguistische Details wurden mit KI erstellt.' : 'Linguistic details were generated with AI.'}</Text>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="library-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{isDe ? 'Ein deutsches Wort nachschlagen' : 'Look up a German word'}</Text>
          <Text style={styles.emptyText}>{isDe ? 'Gib mindestens zwei Buchstaben ein und wähle ein Wort aus.' : 'Enter at least two letters and select a word.'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  header: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.headerBg },
  title: { color: '#fff', fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 4, color: '#cfc9bd', fontSize: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 14, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardBg },
  searchInput: { flex: 1, color: colors.textDark, fontSize: 16 },
  results: { marginHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardBg },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultText: { color: colors.textDark, fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  emptyTitle: { color: colors.textDark, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { maxWidth: 340, color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  messageCard: { margin: 16, padding: 15, borderRadius: 10, backgroundColor: colors.die.bg },
  errorText: { color: colors.die.text, lineHeight: 20 },
  entryBody: { paddingHorizontal: 18, paddingBottom: 50 },
  wordHeader: { padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.cardBg },
  wordTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  word: { flex: 1, color: colors.textDark, fontSize: 28, fontWeight: '800' },
  partOfSpeech: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, color: colors.misc.text, backgroundColor: colors.misc.bg, fontSize: 13, fontWeight: '800' },
  queriedForm: { marginTop: 10, color: colors.textMuted, fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 10, color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  meaningRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  meaningNumber: { width: 24, height: 24, paddingTop: 3, borderRadius: 12, color: colors.misc.text, backgroundColor: colors.misc.bg, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  flex: { flex: 1 },
  meaningEnglish: { color: colors.textDark, fontSize: 17, fontWeight: '800' },
  definition: { marginTop: 3, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  formsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  formCard: { minWidth: '46%', flexGrow: 1, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardBg },
  formLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  formValue: { marginTop: 4, color: colors.textDark, fontSize: 15, fontWeight: '800' },
  grammarTable: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardBg },
  grammarRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.border },
  grammarRowLast: { borderBottomWidth: 0 },
  grammarLabel: { width: '42%', paddingHorizontal: 13, paddingVertical: 11, color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  grammarValue: { flex: 1, paddingHorizontal: 13, paddingVertical: 11, borderLeftWidth: 1, borderLeftColor: colors.border, color: colors.textDark, fontSize: 15, fontWeight: '800' },
  exampleCard: { marginBottom: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: colors.misc.text, borderRadius: 8, backgroundColor: colors.cardBg },
  exampleGermanRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exampleGerman: { flex: 1, color: colors.textDark, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  exampleEnglish: { marginTop: 4, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  note: { marginBottom: 7, color: colors.textDark, fontSize: 14, lineHeight: 20 },
  relatedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relatedChip: { paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.cardBg },
  relatedText: { color: colors.misc.text, fontSize: 13, fontWeight: '700' },
  aiNotice: { marginTop: 28, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
