import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function NeonLine({ styles }) {
  return (
    <View style={styles.neonLine}>
      <View style={styles.neonTopTip} />
      <View style={styles.neonCore} />
      <View style={styles.neonBottomTip} />
    </View>
  );
}

function TabItem({ icon, iconSize, label, active, onPress, colors, styles }) {
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
          <Ionicons name={active ? icon : `${icon}-outline`} size={iconSize} color={tint} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
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
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const compact = width <= 480;
  const iconSize = compact ? 17 : 22;
  const styles = useMemo(() => makeStyles(colors, compact), [colors, compact]);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, compact ? 10 : 0),
          paddingRight: Math.max(insets.right, compact ? 10 : 0),
        },
      ]}
    >
      <TabItem
        icon="book"
        iconSize={iconSize}
        label={t('words')}
        active={tab === 'words'}
        onPress={() => onChange('words')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="flask"
        iconSize={iconSize}
        label={t('languageLab')}
        active={tab === 'lab'}
        onPress={() => onChange('lab')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="document-text"
        iconSize={iconSize}
        label={t('notes')}
        active={tab === 'notes'}
        onPress={() => onChange('notes')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="game-controller"
        iconSize={iconSize}
        label={t('games')}
        active={tab === 'games'}
        onPress={() => onChange('games')}
        colors={colors}
        styles={styles}
      />
      <TabItem
        icon="people"
        iconSize={iconSize}
        label={t('network')}
        active={tab === 'network'}
        onPress={() => onChange('network')}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

const makeStyles = (colors, compact) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: compact ? 5 : 8,
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
    height: compact ? 41 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? 2 : 5,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? 2 : 3,
  },
  neonPlaceholder: {
    width: compact ? 1 : 2,
  },
  neonLine: {
    width: compact ? 2 : 4,
    height: compact ? 41 : 48,
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
    height: compact ? 33 : 40,
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
    fontSize: compact ? 8 : 10,
    maxWidth: compact ? 52 : 82,
    textAlign: 'center',
  },
});
