import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

function TabItem({ icon, label, active, onPress, colors, styles }) {
  const tint = active ? colors.textDark : colors.textMuted;
  return (
    <Pressable style={styles.item} onPress={onPress} hitSlop={6}>
      <Ionicons name={active ? icon : `${icon}-outline`} size={22} color={tint} />
      <Text numberOfLines={1} style={[styles.label, { color: tint, fontWeight: active ? '800' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function BottomBar({ tab, onChange }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TabItem
        icon="book"
        label="Wörterbuch"
        active={tab === 'words'}
        onPress={() => onChange('words')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="language"
        label="Übersetzer"
        active={tab === 'translate'}
        onPress={() => onChange('translate')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="school"
        label="Grammatik"
        active={tab === 'grammar'}
        onPress={() => onChange('grammar')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="document-text"
        label="Notizen"
        active={tab === 'notes'}
        onPress={() => onChange('notes')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="game-controller"
        label="Spiele"
        active={tab === 'games'}
        onPress={() => onChange('games')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="settings"
        label="Einstellungen"
        active={tab === 'settings'}
        onPress={() => onChange('settings')}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
  },
});
