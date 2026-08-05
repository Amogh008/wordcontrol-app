import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppModal from '../components/AppModal';
import { useTheme } from './ThemeContext';
import { localize } from '../locales';

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const { colors } = useTheme();
  const [dialogs, setDialogs] = useState([]);
  const dialog = dialogs[dialogs.length - 1] || null;

  const close = useCallback((value = false) => {
    setDialogs((current) => {
      const active = current[current.length - 1];
      active?.resolve?.(value);
      return current.slice(0, -1);
    });
  }, []);

  const alert = useCallback((title, message) => {
    setDialogs((current) => [...current, { title, message, tone: 'info', buttons: [{ text: localize('OK'), value: true }] }]);
  }, []);

  const confirm = useCallback(({
    title,
    message,
    confirmText = localize('Continue'),
    cancelText = localize('Cancel'),
    destructive = false,
  }) => new Promise((resolve) => {
    setDialogs((current) => [...current, {
      title,
      message,
      tone: destructive ? 'danger' : 'question',
      resolve,
      buttons: [
        { text: cancelText, value: false },
        { text: confirmText, value: true, primary: true, destructive },
      ],
    }]);
  }), []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);
  const icon = dialog?.tone === 'danger' ? 'warning' : dialog?.tone === 'question' ? 'help-circle' : 'information-circle';
  const iconColor = dialog?.tone === 'danger' ? '#c92a2a' : '#2b8aa0';

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AppModal visible={Boolean(dialog)} title={dialog?.title} onClose={() => close(false)}>
        <View style={styles.messageRow}>
          <View style={[styles.icon, { backgroundColor: dialog?.tone === 'danger' ? 'rgba(201,42,42,0.12)' : 'rgba(98,214,238,0.14)' }]}>
            <Ionicons name={icon} size={25} color={iconColor} />
          </View>
          <Text style={[styles.message, { color: colors.textDark }]}>{dialog?.message}</Text>
        </View>
        <View style={styles.actions}>
          {dialog?.buttons?.map((button) => <Pressable
            key={button.text}
            onPress={() => close(button.value)}
            style={[
              styles.button,
              { borderColor: colors.border, backgroundColor: colors.pageBg },
              button.primary && styles.primaryButton,
              button.destructive && styles.dangerButton,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.textDark }, button.primary && styles.primaryText, button.destructive && styles.dangerText]}>{button.text}</Text>
          </Pressable>)}
        </View>
      </AppModal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const value = useContext(AppDialogContext);
  if (!value) throw new Error('useAppDialog must be used within AppDialogProvider');
  return value;
}

const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, paddingTop: 2, fontSize: 15, lineHeight: 22 },
  actions: { marginTop: 22, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: { minHeight: 44, minWidth: 92, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22 },
  primaryButton: { borderColor: '#62d6ee', backgroundColor: '#bfeefa' },
  dangerButton: { borderColor: '#ef9a9a', backgroundColor: '#ffe3e3' },
  buttonText: { fontSize: 14, fontWeight: '800' },
  primaryText: { color: '#155a6a' },
  dangerText: { color: '#9f1f1f' },
});
