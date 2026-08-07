import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WordControlScreen from './src/screens/WordControlScreen';
import NotesScreen from './src/screens/NotesScreen';
import GamesScreen from './src/screens/GamesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LanguageLabScreen from './src/screens/LanguageLabScreen';
import SpeakingNetworkScreen from './src/screens/SpeakingNetworkScreen';
import AuthScreen from './src/screens/AuthScreen';
import BottomBar from './src/components/BottomBar';
import { HazySelectButton } from './src/components/HazySelect';
import OnboardingScreen from './src/components/OnboardingScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { LanguageProfileProvider, useLanguageProfile } from './src/context/LanguageProfileContext';
import { AppDialogProvider } from './src/context/AppDialogContext';
import { localize } from './src/locales';
import { languageByCode } from './src/languages';
import * as preferencesService from './src/services/preferencesService';
import { rememberOnboarded, wasOnboardedOnThisDevice } from './src/services/onboardingCache';

function TabPanel({ active, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    scale.setValue(0.965);
    Animated.timing(scale, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, scale]);

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.tabPanel,
        {
          display: active ? 'flex' : 'none',
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function MainApp() {
  const [tab, setTab] = useState('words');
  const previousTab = useRef('words');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile, profiles, supportedLanguages, choose, addProfile, deleteProfile, loading } = useLanguageProfile();
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [deletingProfileId, setDeletingProfileId] = useState(null);
  const [profilePendingDelete, setProfilePendingDelete] = useState(null);
  const availableLanguages = supportedLanguages.filter(
    (language) => !profiles.some((profile) => profile.language === language.code),
  );

  const changeTab = (nextTab) => {
    previousTab.current = nextTab;
    setTab(nextTab);
  };

  const toggleSettings = () => {
    if (tab === 'settings') {
      setTab(previousTab.current);
      return;
    }
    previousTab.current = tab;
    setTab('settings');
  };

  const performProfileDeletion = async (profile) => {
    setDeletingProfileId(profile.id);
    try {
      await deleteProfile(profile);
      setProfilePendingDelete(null);
      setProfilePickerOpen(false);
    } catch (error) {
      setProfilePendingDelete(null);
      setProfileError(error.response?.data?.error || error.message || localize('Please try again.'));
    } finally {
      setDeletingProfileId(null);
    }
  };

  const confirmProfileDeletion = (profile) => {
    setProfileError('');
    setProfilePendingDelete(profile);
  };

  return (
    <View style={[styles.app, { backgroundColor: colors.pageBg }]}>
      <View key={activeProfile?.id || 'profile-loading'} style={[styles.tabContent, { backgroundColor: colors.pageBg }]}>
        <TabPanel active={tab === 'words'}>
          <WordControlScreen />
        </TabPanel>
        <TabPanel active={tab === 'lab'}>
          <LanguageLabScreen />
        </TabPanel>
        <TabPanel active={tab === 'notes'}>
          <NotesScreen />
        </TabPanel>
        <TabPanel active={tab === 'games'}>
          <GamesScreen active={tab === 'games'} />
        </TabPanel>
        <TabPanel active={tab === 'network'}>
          <SpeakingNetworkScreen />
        </TabPanel>
        <TabPanel active={tab === 'settings'}>
          <SettingsScreen />
        </TabPanel>
      </View>
      <HazySelectButton
        compact
        onPress={() => setProfilePickerOpen(true)}
        disabled={!activeProfile || loading}
        style={[styles.profileButton, { top: Math.max(insets.top, 8) + 10 }]}
      >
        <View style={styles.topFlagCircle}>
          <Text style={styles.topFlagText}>{languageByCode(activeProfile?.language)?.flag}</Text>
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.profileButtonText, { color: colors.textDark }]}
        >
          {activeProfile?.name || 'Language'}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.textDark} />
      </HazySelectButton>
      <Pressable
        onPress={toggleSettings}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={tab === 'settings' ? 'Close settings' : 'Open settings'}
        style={[
          styles.settingsButton,
          {
            top: Math.max(insets.top, 8) + 10,
            backgroundColor: tab === 'settings' ? '#bfeefa' : colors.cardBg,
            borderColor: tab === 'settings' ? '#62d6ee' : colors.border,
          },
        ]}
      >
        <Ionicons
          name={tab === 'settings' ? 'close' : 'settings-outline'}
          size={21}
          color={tab === 'settings' ? '#155a6a' : colors.textDark}
        />
      </Pressable>
      <BottomBar tab={tab} onChange={changeTab} />
      <Modal visible={profilePickerOpen} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={() => profilePendingDelete ? setProfilePendingDelete(null) : setProfilePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => {}}>
          <Pressable style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => {}}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.profileTitle, { color: colors.textDark }]}>Language profile</Text>
              <Pressable onPress={() => setProfilePickerOpen(false)} hitSlop={8} accessibilityLabel="Close language profiles">
                <Ionicons name="close" size={23} color={colors.textDark} />
              </Pressable>
            </View>
            <ScrollView style={styles.profileList} contentContainerStyle={styles.languageListContent} showsVerticalScrollIndicator>
              {profiles.map((profile) => {
                const selected = profile?.id === activeProfile?.id;
                return (
                  <Pressable
                    key={profile.id}
                    style={[styles.profileRow, { borderColor: colors.border }, selected && styles.profileRowSelected]}
                    onPress={() => {
                      choose(profile);
                      setProfilePickerOpen(false);
                    }}
                  >
                    <View style={styles.languageIdentity}>
                      <View style={styles.flagCircle}><Text style={styles.flagText}>{languageByCode(profile.language)?.flag}</Text></View>
                      <View><Text style={[styles.profileName, { color: colors.textDark }]}>{profile.name}</Text><Text style={{ color: colors.textMuted }}>Profile ready</Text></View>
                    </View>
                    <View style={styles.profileActions}>
                      {profiles.length > 1 ? (
                        <Pressable
                          disabled={Boolean(deletingProfileId)}
                          hitSlop={7}
                          style={styles.deleteProfileButton}
                          onPress={(event) => {
                            event.stopPropagation?.();
                            confirmProfileDeletion(profile);
                          }}
                        >
                          {deletingProfileId === profile.id
                            ? <ActivityIndicator size="small" color="#c92a2a" />
                            : <Ionicons name="trash-outline" size={19} color="#c92a2a" />}
                        </Pressable>
                      ) : null}
                      <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={23} color={selected ? '#22c55e' : colors.textDark} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {profileError ? <Text style={styles.profileError}>{profileError}</Text> : null}
            <Pressable
              disabled={availableLanguages.length === 0}
              style={[styles.addProfileButton, availableLanguages.length === 0 && styles.disabledButton]}
              onPress={() => {
                setProfileError('');
                setProfilePickerOpen(false);
                setLanguagePickerOpen(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={22} color="#155a6a" />
              <Text style={styles.addProfileText}>
                {availableLanguages.length ? 'Add profile' : 'All languages added'}
              </Text>
            </Pressable>
          </Pressable>
          {profilePendingDelete ? (
            <View style={styles.nestedDialogLayer}>
              <Pressable style={styles.nestedDialogBackdrop} onPress={() => {}} />
              <View style={[styles.nestedDialogCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.nestedDialogHeading}>
                  <View style={styles.nestedDialogIcon}>
                    <Ionicons name="warning" size={25} color="#c92a2a" />
                  </View>
                  <Text style={[styles.nestedDialogTitle, { color: colors.textDark }]}>{localize('Delete language profile?')}</Text>
                </View>
                <Text style={[styles.nestedDialogMessage, { color: colors.textMuted }]}>
                  {`Do you really want to continue? All data in your ${profilePendingDelete.name} profile will be permanently deleted.`}
                </Text>
                <View style={styles.nestedDialogActions}>
                  <Pressable
                    disabled={Boolean(deletingProfileId)}
                    style={[styles.nestedDialogButton, { borderColor: colors.border, backgroundColor: colors.pageBg }]}
                    onPress={() => setProfilePendingDelete(null)}
                  >
                    <Text style={[styles.nestedDialogButtonText, { color: colors.textDark }]}>{localize('Cancel')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={Boolean(deletingProfileId)}
                    style={[styles.nestedDialogButton, styles.nestedDialogDelete, Boolean(deletingProfileId) && styles.disabledButton]}
                    onPress={() => performProfileDeletion(profilePendingDelete)}
                  >
                    {deletingProfileId
                      ? <ActivityIndicator size="small" color="#9f1f1f" />
                      : <Text style={[styles.nestedDialogButtonText, styles.nestedDialogDeleteText]}>{localize('Delete profile')}</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>
      <Modal visible={languagePickerOpen} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={() => !creatingProfile && setLanguagePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => {}}>
          <Pressable style={[styles.profileCard, styles.addLanguageCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => {}}>
            <View style={styles.modalTitleRow}>
              <Pressable disabled={creatingProfile} onPress={() => { setLanguagePickerOpen(false); setProfilePickerOpen(true); }} hitSlop={8}>
                <Ionicons name="chevron-back" size={23} color={colors.textDark} />
              </Pressable>
              <Text style={[styles.profileTitle, { color: colors.textDark }]}>Add language profile</Text>
              <View style={{ width: 23 }} />
            </View>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Choose one language for the new profile.</Text>
            <ScrollView
              style={styles.languageList}
              contentContainerStyle={styles.languageListContent}
              showsVerticalScrollIndicator
              persistentScrollbar
            >
              {availableLanguages.map((language) => (
                <Pressable
                  key={language.code}
                  disabled={creatingProfile}
                  style={[styles.profileRow, { borderColor: colors.border }, creatingProfile && styles.disabledButton]}
                  onPress={async () => {
                    setCreatingProfile(true);
                    setProfileError('');
                    try {
                      await addProfile(language.code);
                      setLanguagePickerOpen(false);
                    } catch (error) {
                      setProfileError(error.response?.data?.error || error.message || 'Could not create profile.');
                    } finally {
                      setCreatingProfile(false);
                    }
                  }}
                >
                  <View style={styles.languageIdentity}>
                    <View style={styles.flagCircle}><Text style={styles.flagText}>{languageByCode(language.code)?.flag}</Text></View>
                    <Text style={[styles.profileName, { color: colors.textDark }]}>{language.name}</Text>
                  </View>
                  {creatingProfile ? <ActivityIndicator size="small" color={colors.textDark} /> : <Ionicons name="add-circle-outline" size={23} color={colors.textDark} />}
                </Pressable>
              ))}
            </ScrollView>
            {availableLanguages.length > 4 ? (
              <View style={[styles.scrollHint, { borderColor: colors.border }]} pointerEvents="none">
                <Text style={[styles.scrollHintText, { color: colors.textMuted }]}>Scroll for more languages</Text>
                <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
              </View>
            ) : null}
            {profileError ? <Text style={styles.profileError}>{profileError}</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function OnboardingGate() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [status, setStatus] = useState('checking'); // 'checking' | 'pending' | 'complete' | 'error'
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    preferencesService.getPreferences()
      .then((preference) => {
        if (cancelled) return;
        if (preference.onboardingCompletedAt) {
          rememberOnboarded(user.id);
          setStatus('complete');
        } else {
          setStatus('pending');
        }
      })
      .catch(async () => {
        if (cancelled) return;
        // Only skip onboarding on a network hiccup if this device has proof this
        // account already finished it - never guess "complete" for a fresh signup.
        const previouslyOnboarded = await wasOnboardedOnThisDevice(user.id);
        if (cancelled) return;
        setStatus(previouslyOnboarded ? 'complete' : 'error');
      });
    return () => { cancelled = true; };
  }, [user.id, retryTick]);

  if (status === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg }}>
        <ActivityIndicator color={colors.textDark} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg, padding: 24, gap: 12 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
          {localize("Couldn't load your account. Check your connection and try again.")}
        </Text>
        <Pressable
          style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#bfeefa' }}
          onPress={() => setRetryTick((n) => n + 1)}
        >
          <Text style={{ color: '#155a6a', fontSize: 14, fontWeight: '800' }}>{localize('Retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'pending') {
    return <OnboardingScreen onComplete={() => { rememberOnboarded(user.id); setStatus('complete'); }} />;
  }

  return <MainApp />;
}

function Root() {
  const { user, initializing } = useAuth();
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg }}>
        <ActivityIndicator color={colors.textDark} />
      </View>
    );
  }

  return (
    <>
      {user ? <LanguageProfileProvider><OnboardingGate /></LanguageProfileProvider> : <AuthScreen />}
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppDialogProvider>
            <AuthProvider>
              <Root />
            </AuthProvider>
          </AppDialogProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPanel: {
    ...StyleSheet.absoluteFillObject,
  },
  settingsButton: {
    position: 'absolute',
    right: 18,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
  profileButton: { position: 'absolute', right: 66, zIndex: 100, maxWidth: 210, gap: 5, elevation: 6 },
  profileButtonText: { minWidth: 0, flexShrink: 1, fontWeight: '700', fontSize: 13 },
  topFlagCircle: { width: 25, height: 25, flexShrink: 0, overflow: 'hidden', borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f4', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  topFlagText: { fontSize: 16, lineHeight: 21 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  profileCard: { width: '100%', maxWidth: 420, maxHeight: '78%', borderWidth: 1, borderRadius: 22, padding: 20, gap: 10 },
  profileTitle: { fontSize: 21, fontWeight: '800', marginBottom: 4 },
  profileRow: { minHeight: 62, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileRowSelected: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  profileName: { fontSize: 16, fontWeight: '700' },
  addProfileButton: { minHeight: 48, marginTop: 4, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  addProfileText: { color: '#155a6a', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileError: { color: '#c92a2a', fontSize: 13, marginTop: 3 },
  addLanguageCard: { maxHeight: 520 },
  languageList: { flexGrow: 0, maxHeight: 350 },
  profileList: { flexGrow: 0, maxHeight: 360 },
  languageListContent: { gap: 9, paddingVertical: 2, paddingRight: 3 },
  languageIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  flagCircle: { width: 36, height: 36, overflow: 'hidden', borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f4', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  flagText: { fontSize: 22, lineHeight: 28 },
  scrollHint: { minHeight: 34, marginTop: -2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderTopWidth: 1 },
  scrollHintText: { fontSize: 12, fontWeight: '700' },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  deleteProfileButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,42,42,0.09)' },
  nestedDialogLayer: { ...StyleSheet.absoluteFillObject, zIndex: 20, elevation: 20, alignItems: 'center', justifyContent: 'center', padding: 22 },
  nestedDialogBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.84)' },
  nestedDialogCard: { width: '100%', maxWidth: 400, padding: 20, borderWidth: 1, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.5, shadowRadius: 28, elevation: 22 },
  nestedDialogHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nestedDialogIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,42,42,0.12)' },
  nestedDialogTitle: { flex: 1, fontSize: 20, fontWeight: '900' },
  nestedDialogMessage: { marginTop: 15, fontSize: 15, lineHeight: 22 },
  nestedDialogActions: { marginTop: 22, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  nestedDialogButton: { minHeight: 44, minWidth: 104, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22 },
  nestedDialogDelete: { borderColor: '#ef9a9a', backgroundColor: '#ffe3e3' },
  nestedDialogButtonText: { fontSize: 14, fontWeight: '800' },
  nestedDialogDeleteText: { color: '#9f1f1f' },
});
