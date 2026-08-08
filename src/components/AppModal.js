import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function AppModal({ visible, title, subtitle, onClose, children, scroll = false, maxWidth = 430 }) {
  const { colors, scheme } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const content = scroll
    ? <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>{children}</ScrollView>
    : children;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={() => {}}>
        <Animated.View style={{ width: '100%', maxWidth, maxHeight: '82%', alignItems: 'center', opacity, transform: [{ scale }] }}>
          <Pressable
            style={[styles.card, { maxWidth, maxHeight: '100%', backgroundColor: scheme === 'dark' ? 'rgba(32,28,23,0.98)' : 'rgba(255,255,255,0.97)', borderColor: colors.border }]}
            onPress={() => {}}
          >
            <View style={styles.header}>
              <View style={styles.headingCopy}>
                <Text style={[styles.title, { color: colors.textDark }]}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
              </View>
              {onClose ? <Pressable style={[styles.close, { backgroundColor: colors.pageBg }]} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textDark} />
              </Pressable> : null}
            </View>
            {content}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, zIndex: 10000, elevation: 10000, padding: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.82)' },
  card: { width: '100%', zIndex: 10001, elevation: 10001, maxHeight: '82%', overflow: 'hidden', padding: 20, borderWidth: 1, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  headingCopy: { flex: 1 },
  title: { fontSize: 21, fontWeight: '900' },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 18 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 8, paddingRight: 3, paddingBottom: 2 },
});
