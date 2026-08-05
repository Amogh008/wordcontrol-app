import { useMemo, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { translateText } from '../services/wordsService';
import OutlinedButton from '../components/OutlinedButton';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

const LABEL = { de: 'Deutsch', en: 'Englisch' };

export default function TranslationScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const labels = isDe ? LABEL : { de: 'German', en: 'English' };
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [from, setFrom] = useState('de');
  const to = from === 'de' ? 'en' : 'de';
  const [input, setInput] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);

  const swap = () => {
    setFrom(to);
    setInput(translation);
    setTranslation(input);
  };

  const handleTranslate = async () => {
    if (input.trim() === '' || loading) return;
    setLoading(true);
    try {
      const { translation: result } = await translateText({ text: input.trim(), from, to });
      setTranslation(result);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? (isDe ? 'Übersetzung fehlgeschlagen.' : 'Translation failed.');
      Alert.alert(isDe ? 'Fehler' : 'Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const canTranslate = input.trim() !== '' && !loading;

  const reset = () => {
    setFrom('de');
    setInput('');
    setTranslation('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{isDe ? 'Mein ' : 'My '}</Text>
          <Text style={styles.titleItalic}>{isDe ? 'Übersetzer' : 'Translator'}</Text>
        </Text>
        <Text style={styles.subtitle}>Deutsch ⇄ Englisch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.langRow}>
          <View style={styles.langChip}>
            <Text style={styles.langChipText}>{labels[from]}</Text>
          </View>
          <Pressable style={styles.swapButton} onPress={swap} hitSlop={8}>
            <Ionicons name="swap-horizontal" size={22} color={colors.textDark} />
          </Pressable>
          <View style={styles.langChip}>
            <Text style={styles.langChipText}>{labels[to]}</Text>
          </View>
        </View>

        <Text style={styles.label}>{labels[from].toUpperCase()}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={from === 'de' ? (isDe ? 'Text auf Deutsch eingeben…' : 'Enter German text…') : (isDe ? 'Text auf Englisch eingeben…' : 'Enter English text…')}
          placeholderTextColor={colors.placeholder}
          value={input}
          onChangeText={setInput}
          multiline
        />

        <View style={styles.actionRow}>
          <OutlinedButton
            title={loading ? (isDe ? 'KI übersetzt…' : 'AI is translating…') : (isDe ? 'Mit KI übersetzen' : 'Translate with AI')}
            icon="translate"
            tone="ai"
            onPress={handleTranslate}
            disabled={!canTranslate}
            loading={loading}
            style={styles.translateButton}
          />

          <Pressable style={styles.clearButton} onPress={reset}>
            <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
            <Text style={styles.clearButtonText}>{isDe ? 'Alles löschen' : 'Clear all'}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{labels[to].toUpperCase()}</Text>
        <View style={styles.output}>
          {translation ? (
            <Text style={styles.outputText}>{translation}</Text>
          ) : (
            <Text style={styles.outputPlaceholder}>{isDe ? 'Die Übersetzung erscheint hier.' : 'The translation will appear here.'}</Text>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  langChip: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  langChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  translateButton: {
    flex: 1,
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
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: colors.die.text,
    fontSize: 15,
    fontWeight: '700',
  },
  output: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 120,
  },
  outputText: {
    fontSize: 16,
    color: colors.textDark,
    lineHeight: 23,
  },
  outputPlaceholder: {
    fontSize: 15,
    color: colors.placeholder,
  },
});
