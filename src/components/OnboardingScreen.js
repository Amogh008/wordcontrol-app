import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { languageByCode } from '../languages';
import { localize } from '../locales';
import * as preferencesService from '../services/preferencesService';

export default function OnboardingScreen({ onComplete }) {
  const { colors, scheme, setThemeScheme } = useTheme();
  const { profiles, supportedLanguages, activeProfile, choose, addProfile, loading: profilesLoading } = useLanguageProfile();
  const styles = makeStyles(colors);

  const [selectedTheme, setSelectedTheme] = useState(scheme);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canContinue = selectedLanguages.length > 0 && !saving && !profilesLoading;

  const toggleLanguage = (code) => {
    setError('');
    setSelectedLanguages((current) => (
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    ));
  };

  const finish = async () => {
    if (selectedLanguages.length === 0) {
      setError(localize('Choose at least one language to start with.'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      setThemeScheme(selectedTheme);

      setSavingProfile(true);
      const createdProfiles = [];
      for (const language of selectedLanguages) {
        const existing = profiles.find((profile) => profile.language === language);
        createdProfiles.push(existing || await addProfile(language));
      }
      setSavingProfile(false);

      const activeProfileForOnboarding = createdProfiles.find((profile) => profile.language === activeProfile?.language)
        || createdProfiles[0];
      choose(activeProfileForOnboarding);

      await preferencesService.updatePreferences({
        theme: selectedTheme,
        activeLanguageProfileId: activeProfileForOnboarding.id,
        onboardingComplete: true,
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message || localize('Please try again.'));
    } finally {
      setSaving(false);
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.pageBg }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.textDark }]}>{localize('Welcome! Let’s set things up')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{localize('Choose your preferences to get started.')}</Text>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{localize('Language profile')}</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{localize('Pick one or more languages to start with.')}</Text>
          <View style={styles.chipRow}>
            {profilesLoading
              ? <ActivityIndicator color={colors.textDark} style={styles.loadingChips} />
              : supportedLanguages.map((option) => {
                const selected = selectedLanguages.includes(option.code);
                return (
                  <Pressable
                    key={option.code}
                    disabled={savingProfile}
                    style={[styles.chip, { borderColor: colors.border }, selected && styles.chipSelected]}
                    onPress={() => toggleLanguage(option.code)}
                  >
                    <Text style={styles.chipFlag}>{languageByCode(option.code)?.flag || option.flag}</Text>
                    <Text style={[styles.chipText, { color: colors.textDark }]}>{option.name}</Text>
                  </Pressable>
                );
              })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{localize('Theme')}</Text>
          <View style={styles.chipRow}>
            {[
              { value: 'light', label: localize('Light'), icon: 'sunny-outline' },
              { value: 'dark', label: localize('Dark'), icon: 'moon-outline' },
            ].map((option) => {
              const selected = selectedTheme === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, { borderColor: colors.border }, selected && styles.chipSelected]}
                  onPress={() => { setSelectedTheme(option.value); setThemeScheme(option.value); }}
                >
                  <Ionicons name={option.icon} size={16} color={colors.textDark} />
                  <Text style={[styles.chipText, { color: colors.textDark }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.continueButton, !canContinue && styles.disabledButton]}
          disabled={!canContinue}
          onPress={finish}
        >
          {saving
            ? <ActivityIndicator size="small" color="#155a6a" />
            : <Text style={styles.continueText}>{localize('Continue')}</Text>}
        </Pressable>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          {localize('You can change any of these anytime in User preference settings.')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 460, maxHeight: '100%', padding: 22, borderWidth: 1, borderRadius: 22, borderColor: colors.border, backgroundColor: colors.cardBg },
  title: { fontSize: 21, fontWeight: '800' },
  subtitle: { marginTop: 4, marginBottom: 12, fontSize: 13 },
  body: { flexGrow: 0 },
  bodyContent: { paddingBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 14, marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 8 },
  loadingChips: { paddingVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderRadius: 999 },
  chipSelected: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  chipFlag: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600' },
  error: { marginTop: 10, color: '#c0392b', fontSize: 12, fontWeight: '600' },
  continueButton: { marginTop: 18, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#bfeefa' },
  disabledButton: { opacity: 0.6 },
  continueText: { color: '#155a6a', fontSize: 16, fontWeight: '800' },
  note: { marginTop: 10, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
