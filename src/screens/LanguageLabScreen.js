import { localize } from "../locales";import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import GrammarScreen from './GrammarScreen';
import TranslationScreen from './TranslationScreen';
import DictionaryScreen from './DictionaryScreen';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function LanguageLabScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tool, setTool] = useState(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize("Lab")}</Text>
        </Text>
        <Text style={styles.subtitle}>{tool ?
          tool === 'translate' ? localize(
            'Translation') : tool === 'grammar' ? localize(
            'Grammar Check') : localize(
            'Dictionary') : localize(
            'Choose a language tool')}
        </Text>
      </View>

      {tool ?
      <View style={styles.toolArea}>
          <View style={styles.toolBar}>
            <Pressable onPress={() => setTool(null)} hitSlop={8} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={colors.textDark} />
              <Text style={styles.backText}>{localize("Lab")}</Text>
            </Pressable>
            <Text style={styles.toolTitle}>
              {tool === 'translate' ? localize(
              'Translation') : tool === 'grammar' ? localize(
              'Grammar') : localize(
              'Dictionary')}
            </Text>
          </View>
          <View style={styles.toolBody}>
            {tool === 'translate' ? <TranslationScreen embedded /> : tool === 'grammar' ? <GrammarScreen embedded /> : <DictionaryScreen embedded />}
          </View>
        </View> :
      <ScrollView contentContainerStyle={styles.menu}>
        <Pressable style={styles.menuCard} onPress={() => setTool('translate')}>
          <View style={[styles.menuIcon, { backgroundColor: '#d9f7fc' }]}>
            <Ionicons name="swap-horizontal" size={27} color="#155a6a" />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>{localize('Translation')}</Text>
            <Text style={styles.menuSubtitle}>
              {localize('Translate between English and your learning language.')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.menuCard} onPress={() => setTool('grammar')}>
          <View style={[styles.menuIcon, { backgroundColor: colors.die.bg }]}>
            <Ionicons name="checkmark-done" size={27} color={colors.die.text} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>{localize('Grammar Check')}</Text>
            <Text style={styles.menuSubtitle}>
              {localize('Check sentences and receive clear corrections.')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.menuCard} onPress={() => setTool('dictionary')}>
          <View style={[styles.menuIcon, { backgroundColor: colors.misc.bg }]}>
            <Ionicons name="library" size={27} color={colors.misc.text} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>{localize('Dictionary')}</Text>
            <Text style={styles.menuSubtitle}>{localize('Enter a word and get meanings, grammar, examples and related words.')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </ScrollView>}
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  header: { backgroundColor: colors.headerBg, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 30 },
  titleBold: { fontFamily: titleFont, fontWeight: '700', color: '#fff' },
  titleItalic: { fontFamily: titleFont, fontStyle: 'italic', color: '#fff' },
  subtitle: { marginTop: 6, fontSize: 14, fontWeight: '600', color: '#cfc9bd' },
  menu: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 14 },
  menuCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.cardBg },
  menuIcon: { width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuTextWrap: { flex: 1 },
  menuTitle: { color: colors.textDark, fontSize: 17, fontWeight: '800' },
  menuSubtitle: { marginTop: 4, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  toolArea: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  toolBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
  toolTitle: { color: colors.textDark, fontSize: 16, fontWeight: '800' },
  toolBody: { flex: 1 }
});
