import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { getDictionaryEntry } from '../services/dictionaryService';
import ReadAloudButton from '../components/ReadAloudButton';
import { localize, localizeFormat } from '../locales';

function Section({ title, children, styles }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

export default function DictionaryScreen({ embedded = false }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { activeProfile } = useLanguageProfile();
  const targetName = localize(activeProfile?.englishName) || activeProfile?.englishName || 'German';
  const speechLocale = activeProfile?.locale || 'de-DE';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  };

  const search = async (requestedWord = query) => {
    const word = requestedWord.trim();
    if (!word || loading) return;
    setLoading(true);
    setEntry(null);
    setError('');
    setQuery(word);
    try {
      const result = await getDictionaryEntry(word, language);
      setEntry(result);
      setQuery(result.correctedWord || word);
      if (result.spellingCorrected) {
        showToast(localizeFormat('Spelling corrected: {0} → {1}', [word, result.correctedWord]));
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || localize('The dictionary entry could not be created. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={embedded ? [] : ['top']}>
      {!embedded ? <View style={styles.header}>
        <Text style={styles.title}>{localize('Dictionary')}</Text>
        <Text style={styles.subtitle}>{localizeFormat('{0} dictionary', [targetName])}</Text>
      </View> : null}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(value) => { setQuery(value); setError(''); }}
          placeholder={localizeFormat('Enter a word in {0}', [targetName])}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => search()}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!query.trim() || loading}
          onPress={() => search()}
          style={[styles.searchButton, (!query.trim() || loading) && styles.disabled]}
        >
          {loading ? <ActivityIndicator size="small" color="#155a6a" /> : <Ionicons name="search" size={18} color="#155a6a" />}
          <Text style={styles.searchButtonText}>{localize('Search')}</Text>
        </Pressable>
      </View>

      {toast ? <View style={[styles.toast, embedded ? styles.toastEmbedded : styles.toastStandalone]}>
        <Ionicons name="information-circle" size={20} color="#155a6a" />
        <Text style={styles.toastText}>{toast}</Text>
      </View> : null}

      {loading ? <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.misc.text} />
        <Text style={styles.loadingText}>{localize('Creating dictionary entry…')}</Text>
      </View> : error ? <View style={styles.messageCard}><Text style={styles.errorText}>{error}</Text></View> : entry ? (
        <ScrollView contentContainerStyle={styles.entryBody} keyboardShouldPersistTaps="handled">
          <View style={styles.wordHeader}>
            <View style={styles.wordTitleRow}>
              <Text style={styles.word}>{entry.article ? `${entry.article} ` : ''}{entry.lemma}</Text>
              <ReadAloudButton text={entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma} language={speechLocale} compact />
            </View>
            <Text style={styles.partOfSpeech}>{entry.partOfSpeech}</Text>
            {entry.pronunciation ? <Text style={styles.meta}>{localize('Pronunciation')}: {entry.pronunciation}</Text> : null}
            {entry.transliteration ? <Text style={styles.meta}>{localize('Transliteration')}: {entry.transliteration}</Text> : null}
            {entry.grammaticalGender ? <Text style={styles.meta}>{localize('Grammatical gender')}: {entry.grammaticalGender}</Text> : null}
            {entry.searchedWord !== entry.lemma ? <Text style={styles.meta}>{localize('Searched form')}: {entry.searchedWord}</Text> : null}
          </View>

          <Section title={localize('MEANINGS')} styles={styles}>
            {entry.meanings?.map((meaning, index) => <View key={`${meaning.translation}-${index}`} style={styles.meaningRow}>
              <Text style={styles.meaningNumber}>{index + 1}</Text>
              <View style={styles.flex}>
                <Text style={styles.meaningTranslation}>{meaning.translation}</Text>
                <Text style={styles.definition}>{meaning.definition}</Text>
              </View>
            </View>)}
          </Section>

          {entry.plural ? <Section title={localize('PLURAL')} styles={styles}>
            <View style={styles.formCard}><Text style={styles.formLabel}>{localize('Plural form')}</Text><Text style={styles.formValue}>{entry.plural}</Text></View>
          </Section> : null}

          {entry.grammarSections?.map((grammarSection, sectionIndex) => <Section
            key={`${grammarSection.title}-${sectionIndex}`}
            title={(grammarSection.title || localize('GRAMMATICAL FORMS')).toLocaleUpperCase()}
            styles={styles}
          >
            <View style={styles.grammarTable}>
              {grammarSection.forms?.map((form, formIndex) => <View key={`${form.label}-${form.value}-${formIndex}`} style={[styles.grammarRow, formIndex === grammarSection.forms.length - 1 && styles.grammarRowLast]}>
                <Text style={styles.grammarLabel}>{form.label}</Text><Text style={styles.grammarValue}>{form.value}</Text>
              </View>)}
            </View>
          </Section>)}

          {entry.examples?.length ? <Section title={localize('EXAMPLE SENTENCES')} styles={styles}>
            {entry.examples.map((example, index) => <View key={`${example.target}-${index}`} style={styles.exampleCard}>
              <View style={styles.exampleTargetRow}><Text style={styles.exampleTarget}>{example.target}</Text><ReadAloudButton text={example.target} language={speechLocale} compact /></View>
              <Text style={styles.exampleTranslation}>{example.translation}</Text>
            </View>)}
          </Section> : null}

          {entry.usageNotes?.length ? <Section title={localize('NOTES')} styles={styles}>
            {entry.usageNotes.map((note, index) => <Text key={`${note}-${index}`} style={styles.note}>• {note}</Text>)}
          </Section> : null}

          {entry.relatedWords?.length ? <Section title={localize('RELATED WORDS')} styles={styles}>
            <View style={styles.relatedWrap}>{entry.relatedWords.map((word) => <Pressable key={word} style={styles.relatedChip} onPress={() => search(word)}><Text style={styles.relatedText}>{word}</Text></Pressable>)}</View>
          </Section> : null}
          <Text style={styles.aiNotice}>{localize('Linguistic details were generated with AI.')}</Text>
        </ScrollView>
      ) : <View style={styles.center}>
        <Ionicons name="library-outline" size={42} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{localizeFormat('Look up a {0} word', [targetName])}</Text>
        <Text style={styles.emptyText}>{localize('Enter a word and press Search.')}</Text>
      </View>}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  header: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.headerBg },
  title: { color: '#fff', fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 4, color: '#cfc9bd', fontSize: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, margin: 16, paddingLeft: 14, paddingRight: 6, minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardBg },
  searchInput: { flex: 1, minWidth: 0, color: colors.textDark, fontSize: 16 },
  searchButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 13, borderRadius: 9, backgroundColor: '#bfeefa' },
  searchButtonText: { color: '#155a6a', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 20, elevation: 8, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: '#62d6ee', borderRadius: 11, backgroundColor: '#d9f7fc', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 7 },
  toastEmbedded: { top: 76 },
  toastStandalone: { top: 148 },
  toastText: { flex: 1, color: '#155a6a', fontSize: 13, fontWeight: '800' },
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
  meta: { marginTop: 8, color: colors.textMuted, fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 10, color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  meaningRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  meaningNumber: { width: 24, height: 24, paddingTop: 3, borderRadius: 12, color: colors.misc.text, backgroundColor: colors.misc.bg, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  flex: { flex: 1 },
  meaningTranslation: { color: colors.textDark, fontSize: 17, fontWeight: '800' },
  definition: { marginTop: 3, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  formCard: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardBg },
  formLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  formValue: { marginTop: 4, color: colors.textDark, fontSize: 15, fontWeight: '800' },
  grammarTable: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardBg },
  grammarRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.border },
  grammarRowLast: { borderBottomWidth: 0 },
  grammarLabel: { width: '42%', paddingHorizontal: 13, paddingVertical: 11, color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  grammarValue: { flex: 1, paddingHorizontal: 13, paddingVertical: 11, borderLeftWidth: 1, borderLeftColor: colors.border, color: colors.textDark, fontSize: 15, fontWeight: '800' },
  exampleCard: { marginBottom: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: colors.misc.text, borderRadius: 8, backgroundColor: colors.cardBg },
  exampleTargetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exampleTarget: { flex: 1, color: colors.textDark, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  exampleTranslation: { marginTop: 4, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  note: { marginBottom: 7, color: colors.textDark, fontSize: 14, lineHeight: 20 },
  relatedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relatedChip: { paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.cardBg },
  relatedText: { color: colors.misc.text, fontSize: 13, fontWeight: '700' },
  aiNotice: { marginTop: 28, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
