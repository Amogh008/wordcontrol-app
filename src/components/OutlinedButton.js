import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function OutlinedButton({
  title,
  icon = 'check-circle-outline',
  loading = false,
  disabled = false,
  tone = 'default',
  onPress,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inactive = disabled || loading;
  const success = tone === 'success';
  const ai = tone === 'ai';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        success && styles.buttonSuccess,
        ai && styles.buttonAi,
        style,
        inactive && styles.buttonDisabled,
        pressed && !inactive && (success || ai ? styles.buttonTonePressed : styles.buttonPressed),
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={success ? colors.das.text : colors.misc.text}
        />
      ) : (
        <MaterialIcons
          name={icon}
          size={19}
          color={inactive ? colors.textMuted : success ? colors.das.text : colors.misc.text}
        />
      )}
      <Text
        style={[
          styles.text,
          success && styles.textSuccess,
          inactive && styles.textDisabled,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    button: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: colors.misc.text,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    buttonPressed: {
      backgroundColor: colors.misc.bg,
    },
    buttonSuccess: {
      borderColor: colors.das.text,
      backgroundColor: colors.das.bg,
    },
    buttonAi: {
      borderColor: colors.misc.text,
      backgroundColor: colors.misc.bg,
    },
    buttonTonePressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      borderColor: colors.border,
      backgroundColor: 'transparent',
      opacity: 0.7,
    },
    text: {
      color: colors.misc.text,
      fontSize: 15,
      fontWeight: '700',
    },
    textDisabled: {
      color: colors.textMuted,
    },
    textSuccess: {
      color: colors.das.text,
    },
  });
