import { useMemo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function initialsFor(user) {
  const source = (user?.name || user?.email || '?').trim();
  return source.charAt(0).toUpperCase();
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors, scheme, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Meine </Text>
          <Text style={styles.titleItalic}>Einstellungen</Text>
        </Text>
      </View>

      <View style={styles.content}>
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
      </View>
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
  content: { flex: 1, padding: 20 },
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
});
