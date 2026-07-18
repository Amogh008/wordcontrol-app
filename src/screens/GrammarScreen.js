import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { checkGrammar } from '../services/wordsService';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

const GOOD = { text: '#2f9e44', bg: '#d3f9d8', border: '#2f9e44' };
const WARN = { text: '#c2255c', bg: '#ffdeeb', border: '#c2255c' };

export default function GrammarScreen() {
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
      const msg = err.response?.data?.error ?? err.message ?? 'Prüfung fehlgeschlagen.';
      Alert.alert('Fehler', msg);
    } finally {
      setLoading(false);
    }
  };

  const canCheck = sentence.trim() !== '' && !loading;
  const showCorrection = result && !result.correct && result.corrected && result.corrected !== sentence.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Mein </Text>
          <Text style={styles.titleItalic}>Grammatik-Check</Text>
        </Text>
        <Text style={styles.subtitle}>Ist dein Satz korrekt?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>DEUTSCHER SATZ</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="z.B. Ich habe gestern ins Kino gegangen."
          placeholderTextColor={colors.placeholder}
          value={sentence}
          onChangeText={setSentence}
          multiline
        />

        <Pressable
          style={[styles.checkButton, !canCheck && styles.checkButtonDisabled]}
          onPress={handleCheck}
          disabled={!canCheck}
        >
          <Ionicons name="checkmark-done" size={16} color="#fff" />
          <Text style={styles.checkButtonText}>{loading ? 'Prüft…' : 'Prüfen'}</Text>
        </Pressable>

        {result ? (
          <View>
            <View
              style={[
                styles.statusBanner,
                { backgroundColor: result.correct ? GOOD.bg : WARN.bg, borderColor: result.correct ? GOOD.border : WARN.border },
              ]}
            >
              <Ionicons
                name={result.correct ? 'checkmark-circle' : 'alert-circle'}
                size={22}
                color={result.correct ? GOOD.text : WARN.text}
              />
              <Text style={[styles.statusText, { color: result.correct ? GOOD.text : WARN.text }]}>
                {result.correct ? 'Richtig!' : 'Enthält Fehler'}
              </Text>
            </View>

            {showCorrection ? (
              <>
                <Text style={styles.label}>KORREKTUR</Text>
                <View style={styles.correctionCard}>
                  <Text style={styles.correctionText}>{result.corrected}</Text>
                </View>
              </>
            ) : null}

            {result.feedback ? (
              <>
                <Text style={styles.label}>ERKLÄRUNG</Text>
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackText}>{result.feedback}</Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.headerBg,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 22,
  },
  checkButtonDisabled: {
    backgroundColor: colors.disabledButton,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '800',
  },
  correctionCard: {
    backgroundColor: GOOD.bg,
    borderWidth: 1,
    borderColor: GOOD.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  correctionText: {
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '600',
    lineHeight: 23,
  },
  feedbackCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  feedbackText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
});
