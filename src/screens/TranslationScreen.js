import { localize } from "../locales";import { useEffect, useMemo, useState } from 'react';
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
import { HazySelectButton } from '../components/HazySelect';
import AppModal from '../components/AppModal';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { translateText } from '../services/wordsService';
import OutlinedButton from '../components/OutlinedButton';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { SUPPORTED_LANGUAGES } from '../languages';
import { useAppDialog } from '../context/AppDialogContext';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

const ENGLISH_LABELS = Object.fromEntries(SUPPORTED_LANGUAGES.map(({ code, name }) => [code, name]));
const GERMAN_LABELS = { ...ENGLISH_LABELS, de: 'Deutsch', en: 'Englisch', es: 'Spanisch', fr: 'Französisch' };

export default function TranslationScreen({ embedded = false }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const { activeProfile } = useLanguageProfile();
  const dialog = useAppDialog();
  const targetCode = activeProfile?.language || 'de';
  const labels = localize(ENGLISH_LABELS);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultFrom = language === targetCode ? '' : language;
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(targetCode);
  const [input, setInput] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [languagePicker, setLanguagePicker] = useState(null);

  useEffect(() => {
    setFrom(language === targetCode ? '' : language);
    setTo(targetCode);
    setInput('');
    setTranslation('');
  }, [language, targetCode]);

  const swap = () => {
    if (!from || !to) return;
    setFrom(to);
    setTo(from);
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
      const msg = err.response?.data?.error ?? err.message ?? localize('Translation failed.');
      dialog.alert(localize('Error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const canTranslate = input.trim() !== '' && from && to && from !== to && !loading;

  const reset = () => {
    setFrom(defaultFrom);
    setTo(targetCode);
    setInput('');
    setTranslation('');
  };

  const chooseLanguage = (code) => {
    if (languagePicker === 'source') {
      setFrom(code);
      if (code === to) setTo('');
    } else {
      setTo(code);
      if (code === from) setFrom('');
    }
    setLanguagePicker(null);
  };

  const selectedSource = SUPPORTED_LANGUAGES.find((option) => option.code === from);
  const selectedTarget = SUPPORTED_LANGUAGES.find((option) => option.code === to);

  const content =
  <>
      {!embedded ? <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize('Translator')}</Text>
        </Text>
        <Text style={styles.subtitle}>{localize('Choose source and target languages')}</Text>
      </View> : null}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.langRow}>
          <HazySelectButton style={styles.langChip} onPress={() => setLanguagePicker('source')}>
            <View style={styles.selectIdentity}>
              {selectedSource ? <View style={styles.flagCircle}><Text style={styles.flagText}>{selectedSource.flag}</Text></View> : null}
              <Text numberOfLines={1} style={[styles.selectText, !selectedSource && styles.selectPlaceholder]}>{selectedSource ? localize(selectedSource.name) : localize('Source language')}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </HazySelectButton>
          <Pressable style={[styles.swapButton, (!from || !to) && styles.swapButtonDisabled]} onPress={swap} disabled={!from || !to} hitSlop={8}>
            <Ionicons name="swap-horizontal" size={22} color={colors.textDark} />
          </Pressable>
          <HazySelectButton style={styles.langChip} onPress={() => setLanguagePicker('target')}>
            <View style={styles.selectIdentity}>
              {selectedTarget ? <View style={styles.flagCircle}><Text style={styles.flagText}>{selectedTarget.flag}</Text></View> : null}
              <Text numberOfLines={1} style={[styles.selectText, !selectedTarget && styles.selectPlaceholder]}>{selectedTarget ? localize(selectedTarget.name) : localize('Target language')}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </HazySelectButton>
        </View>

        <Text style={styles.label}>{from ? labels[from].toUpperCase() : localize('SOURCE TEXT')}</Text>
        <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={from ? `${localize('Enter text in')} ${labels[from]}…` : localize('Choose a source language first…')}
        placeholderTextColor={colors.placeholder}
        value={input}
        onChangeText={setInput}
        multiline />


        <View style={styles.actionRow}>
          <OutlinedButton
          title={loading ? localize('AI is translating…') : localize('Translate with AI')}
          icon="translate"
          tone="ai"
          onPress={handleTranslate}
          disabled={!canTranslate}
          loading={loading}
          style={styles.translateButton} />


          <Pressable style={styles.clearButton} onPress={reset}>
            <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
            <Text style={styles.clearButtonText}>{localize('Clear all')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{to ? labels[to].toUpperCase() : localize('TARGET TEXT')}</Text>
        <View style={styles.output}>
          {translation ?
        <Text style={styles.outputText}>{translation}</Text> :

        <Text style={styles.outputPlaceholder}>{localize('The translation will appear here.')}</Text>
        }
        </View>
      </ScrollView>
      <AppModal
        visible={Boolean(languagePicker)}
        title={languagePicker === 'source' ? localize('Source language') : localize('Target language')}
        subtitle={localize('Choose a language')}
        onClose={() => setLanguagePicker(null)}
        scroll>
        {SUPPORTED_LANGUAGES.map((option) => {
          const selected = option.code === (languagePicker === 'source' ? from : to);
          return <Pressable key={option.code} style={[styles.languageRow, selected && styles.languageRowSelected]} onPress={() => chooseLanguage(option.code)}>
            <View style={styles.selectIdentity}>
              <View style={styles.modalFlagCircle}><Text style={styles.modalFlagText}>{option.flag}</Text></View>
              <Text style={styles.languageName}>{localize(option.name)}</Text>
            </View>
            <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={22} color={selected ? '#22c55e' : colors.textMuted} />
          </Pressable>;
        })}
      </AppModal>
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
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18
  },
  langChip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10
  },
  selectIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagCircle: { width: 27, height: 27, overflow: 'hidden', borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f4' },
  flagText: { fontSize: 17, lineHeight: 22 },
  selectText: { flex: 1, color: colors.textDark, fontSize: 13, fontWeight: '800' },
  selectPlaceholder: { color: colors.textMuted },
  languageRow: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.025)' },
  languageRowSelected: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  modalFlagCircle: { width: 38, height: 38, overflow: 'hidden', borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f4' },
  modalFlagText: { fontSize: 23, lineHeight: 29 },
  languageName: { flex: 1, color: colors.textDark, fontSize: 15, fontWeight: '800' },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  swapButtonDisabled: { opacity: 0.45 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6
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
    minHeight: 120,
    textAlignVertical: 'top'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  translateButton: {
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
  output: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 120
  },
  outputText: {
    fontSize: 16,
    color: colors.textDark,
    lineHeight: 23
  },
  outputPlaceholder: {
    fontSize: 15,
    color: colors.placeholder
  }
});
