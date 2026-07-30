import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isGoogleConfigured, useGoogleIdTokenRequest } from '../services/googleAuth';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function initialsFor(user) {
  const source = (user?.name || user?.email || '?').trim();
  return source.charAt(0).toUpperCase();
}

export default function SettingsScreen() {
  const { user, logout, deleteAccount, linkGoogle } = useAuth();
  const { colors, scheme, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [deleting, setDeleting] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [googleRequest, googleResponse, promptGoogle] = useGoogleIdTokenRequest();

  useEffect(() => {
    if (googleResponse?.type !== 'success' || !googleResponse.params?.id_token) return;
    setLinkingGoogle(true);
    linkGoogle(googleResponse.params.id_token)
      .then(() => Alert.alert('Google linked', 'You can now sign in using Google.'))
      .catch((err) => {
        Alert.alert('Could not link Google', err.response?.data?.error || err.message);
      })
      .finally(() => setLinkingGoogle(false));
  }, [googleResponse, linkGoogle]);

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      // react-native-web's Alert.alert is a no-op; window.confirm is the web equivalent.
      if (window.confirm('Are you sure you want to log out?')) {
        logout();
      }
      return;
    }
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const performAccountDeletion = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      Alert.alert(
        'Account could not be deleted',
        err.response?.data?.error ?? err.message ?? 'Please try again.',
      );
      setDeleting(false);
    }
  };

  const confirmAccountDeletion = () => {
    const message =
      'This permanently deletes your account, saved vocabulary, and notes. This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) performAccountDeletion();
      return;
    }
    Alert.alert('Delete account?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: performAccountDeletion },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Meine </Text>
          <Text style={styles.titleItalic}>Einstellungen</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(user)}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'No name set'}</Text>
          <Text style={styles.email}>{user?.email || 'Signed in with Google'}</Text>
        </View>

        <Text style={styles.sectionLabel}>KONTO</Text>
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>Email</Text>
              <Text style={styles.optionValue}>{user?.email || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.optionRow}>
            <Ionicons name="logo-google" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>Google account</Text>
              <Text style={styles.optionValue}>{user?.googleId ? 'Linked' : 'Not linked'}</Text>
            </View>
            {!user?.googleId && isGoogleConfigured ? (
              <Pressable
                style={[styles.linkButton, linkingGoogle && styles.disabledButton]}
                onPress={() => promptGoogle()}
                disabled={!googleRequest || linkingGoogle}
              >
                {linkingGoogle ? (
                  <ActivityIndicator size="small" color={colors.misc.text} />
                ) : (
                  <Text style={styles.linkButtonText}>Link Google</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>DARSTELLUNG</Text>
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name={scheme === 'dark' ? 'moon' : 'moon-outline'} size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>Dark mode</Text>
              <Text style={styles.optionValue}>{scheme === 'dark' ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={scheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.disabledButton, true: colors.activePill }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#c0392b" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, deleting && styles.disabledButton]}
          onPress={confirmAccountDeletion}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#fff" />
          )}
          <Text style={styles.deleteText}>
            {deleting ? 'Deleting account…' : 'Delete account'}
          </Text>
        </Pressable>
        <Text style={styles.deleteHelp}>
          Permanently removes your account, vocabulary, and notes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: { fontSize: 30 },
  titleBold: { fontFamily: titleFont, fontWeight: '700', color: '#fff' },
  titleItalic: { fontFamily: titleFont, fontStyle: 'italic', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.activePill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  optionsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 13, color: colors.textMuted },
  optionValue: { fontSize: 15, color: colors.textDark, fontWeight: '600', marginTop: 2 },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.misc.text,
    borderRadius: 999,
  },
  linkButtonText: { color: colors.misc.text, fontSize: 12, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: '#f1c6c0',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: { color: '#c0392b', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  disabledButton: { opacity: 0.6 },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteHelp: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
