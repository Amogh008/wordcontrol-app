import { Picker } from '@react-native-picker/picker';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function surface(scheme) {
  return scheme === 'dark' ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.72)';
}

export function HazySelectButton({ children, compact = false, style, ...props }) {
  const { colors, scheme } = useTheme();
  return (
    <Pressable
      {...props}
      style={[
        styles.surface,
        compact ? styles.compactButton : styles.button,
        { backgroundColor: surface(scheme), borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function HazyPicker({ children, containerStyle, pickerStyle, ...props }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={[styles.surface, styles.pickerWrap, { backgroundColor: surface(scheme), borderColor: colors.border }, containerStyle]}>
      <Picker
        {...props}
        dropdownIconColor={props.dropdownIconColor || colors.textDark}
        style={[styles.picker, { color: colors.textDark }, pickerStyle]}
      >
        {children}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerWrap: {
    minHeight: 48,
    borderRadius: 24,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    minHeight: 48,
    backgroundColor: 'transparent',
  },
});
