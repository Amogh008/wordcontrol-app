import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

function TabItem({ icon, label, active, onPress }) {
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
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TabItem
        icon="book"
        label="Wörterbuch"
        active={tab === 'words'}
        onPress={() => onChange('words')}
      />
      <TabItem
        icon="language"
        label="Übersetzer"
        active={tab === 'translate'}
        onPress={() => onChange('translate')}
      />
      <TabItem
        icon="school"
        label="Grammatik"
        active={tab === 'grammar'}
        onPress={() => onChange('grammar')}
      />
      <TabItem
        icon="game-controller"
        label="Spiele"
        active={tab === 'games'}
        onPress={() => onChange('games')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
