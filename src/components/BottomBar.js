import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

function NeonLine({ styles }) {
  return (
    <View style={styles.neonLine}>
      <View style={styles.neonTopTip} />
      <View style={styles.neonCore} />
      <View style={styles.neonBottomTip} />
    </View>
  );
}

function TabItem({ icon, label, active, onPress, colors, styles }) {
  const tint = active ? colors.textDark : colors.textMuted;
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.selectionFrame}>
        {active ? <NeonLine styles={styles} /> : <View style={styles.neonPlaceholder} />}
        <View style={styles.tabContent}>
          <Ionicons name={active ? icon : `${icon}-outline`} size={22} color={tint} />
          <Text
            numberOfLines={1}
            style={[styles.label, { color: tint, fontWeight: active ? '800' : '600' }]}
          >
            {label}
          </Text>
        </View>
        {active ? <NeonLine styles={styles} /> : <View style={styles.neonPlaceholder} />}
      </View>
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
        icon="library"
        label="Dictionary"
        active={tab === 'dictionary'}
        onPress={() => onChange('dictionary')}
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
  },
  itemPressed: {
    opacity: 0.65,
  },
  selectionFrame: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  neonPlaceholder: {
    width: 2,
  },
  neonLine: {
    width: 4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#55dfff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 3,
  },
  neonTopTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#63ddff',
  },
  neonCore: {
    width: 1.5,
    height: 40,
    backgroundColor: '#63ddff',
  },
  neonBottomTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#63ddff',
  },
  label: {
    fontSize: 10,
  },
});
