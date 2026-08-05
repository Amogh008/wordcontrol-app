import { localize, localizeFormat } from "../locales";import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { checkGrammar } from '../services/wordsService';
import OutlinedButton from '../components/OutlinedButton';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { useAppDialog } from '../context/AppDialogContext';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

const GOOD = { text: '#2f9e44', bg: '#d3f9d8', border: '#2f9e44' };
const WARN = { text: '#c2255c', bg: '#ffdeeb', border: '#c2255c' };

export default function GrammarScreen({ embedded = false }) {
  const { colors } = useTheme();
  const dialog = useAppDialog();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const { activeProfile } = useLanguageProfile();
  const targetName = localize(activeProfile?.englishName);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (sentence.trim() === '' || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await checkGrammar({ sentence: sentence.trim() });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? localize('Grammar check failed.');
      dialog.alert(localize('Error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const canCheck = sentence.trim() !== '' && !loading;
  const showCorrection = Boolean(result?.corrected);

  const reset = () => {
    setSentence('');
    setResult(null);
  };

  const content =
  <>
      {!embedded ? <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize('Grammar Check')}</Text>
        </Text>
        <Text style={styles.subtitle}>{localizeFormat("Is your {0} sentence correct?", [targetName || 'German'])}</Text>
      </View> : null}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{(targetName || 'German').toUpperCase()} {localize('SENTENCE')}</Text>
        <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={localize("z.B. Ich habe gestern ins Kino gegangen.")}
        placeholderTextColor={colors.placeholder}
        value={sentence}
        onChangeText={setSentence}
        multiline />


        <View style={styles.actionRow}>
          <OutlinedButton
          title={loading ? localize('AI is checking…') : localize('Check with AI')}
          icon="fact-check"
          tone="ai"
          onPress={handleCheck}
          disabled={!canCheck}
          loading={loading}
          style={styles.checkButton} />


          <Pressable style={styles.clearButton} onPress={reset}>
            <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
            <Text style={styles.clearButtonText}>{localize('Clear all')}</Text>
          </Pressable>
        </View>

        {result ?
      <View>
            <View
          style={[
          styles.statusBanner,
          { backgroundColor: result.correct ? GOOD.bg : WARN.bg, borderColor: result.correct ? GOOD.border : WARN.border }]
          }>

              <Ionicons
            name={result.correct ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={result.correct ? GOOD.text : WARN.text} />

              <Text style={[styles.statusText, { color: result.correct ? GOOD.text : WARN.text }]}>
                {result.correct ? localize('Correct!') : localize('Contains errors')}
              </Text>
            </View>

            {showCorrection ?
        <>
                <Text style={styles.label}>
                  {result.correct ? localize('CORRECT SENTENCE') : localize('CORRECTED SENTENCE')}
                </Text>
                <View style={styles.correctionCard}>
                  <Text style={styles.correctionText}>{result.corrected}</Text>
                </View>
              </> :
        null}

            {result.feedback ?
        <>
                <Text style={styles.label}>{localize('EXPLANATION')}</Text>
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackText}>{result.feedback}</Text>
                </View>
              </> :
        null}
          </View> :
      null}
      </ScrollView>
    </>;


  return embedded ? content :
  <SafeAreaView style={styles.safeArea} edges={['top']}>{content}</SafeAreaView>;

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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 16
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22
  },
  checkButton: {
    flex: 1
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  clearButtonText: {
    color: colors.die.text,
    fontSize: 15,
    fontWeight: '700'
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18
  },
  statusText: {
    fontSize: 16,
    fontWeight: '800'
  },
  correctionCard: {
    backgroundColor: colors.das.bg,
    borderWidth: 1,
    borderColor: colors.das.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18
  },
  correctionText: {
    fontSize: 16,
    color: colors.das.text,
    fontWeight: '600',
    lineHeight: 23
  },
  feedbackCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  feedbackText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22
  }
});
