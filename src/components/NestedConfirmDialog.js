import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { localize } from '../locales';

export default function NestedConfirmDialog({ visible, title, message, confirmText, cancelText = localize('Cancel'), destructive = false, loading = false, onCancel, onConfirm }) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={styles.layer} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={() => {}} />
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: destructive ? 'rgba(201,42,42,0.14)' : 'rgba(98,214,238,0.16)' }]}>
            <Ionicons name={destructive ? 'warning' : 'help-circle'} size={25} color={destructive ? '#c92a2a' : '#2b8aa0'} />
          </View>
          <Text style={[styles.title, { color: colors.textDark }]}>{title}</Text>
        </View>
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
        <View style={styles.actions}>
          <Pressable disabled={loading} style={[styles.button, { borderColor: colors.border, backgroundColor: colors.pageBg }]} onPress={onCancel}>
            <Text style={[styles.buttonText, { color: colors.textDark }]}>{cancelText}</Text>
          </Pressable>
          <Pressable disabled={loading} style={[styles.button, destructive ? styles.danger : styles.primary, loading && styles.disabled]} onPress={onConfirm}>
            {loading ? <ActivityIndicator size="small" color={destructive ? '#9f1f1f' : '#155a6a'} /> : <Text style={[styles.buttonText, destructive ? styles.dangerText : styles.primaryText]}>{confirmText}</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, alignItems: 'center', justifyContent: 'center', padding: 22 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.84)' },
  card: { width: '100%', maxWidth: 400, padding: 20, borderWidth: 1, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.5, shadowRadius: 28, elevation: 102 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '900' },
  message: { marginTop: 15, fontSize: 15, lineHeight: 22 },
  actions: { marginTop: 22, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: { minHeight: 44, minWidth: 104, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22 },
  primary: { borderColor: '#62d6ee', backgroundColor: '#bfeefa' },
  danger: { borderColor: '#ef9a9a', backgroundColor: '#ffe3e3' },
  disabled: { opacity: 0.55 },
  buttonText: { fontSize: 14, fontWeight: '800' },
  primaryText: { color: '#155a6a' },
  dangerText: { color: '#9f1f1f' },
});
