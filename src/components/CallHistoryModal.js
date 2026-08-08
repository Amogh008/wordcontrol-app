import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { localize, localizeFormat } from '../locales';
import { useTheme } from '../context/ThemeContext';
import { useFriendRequests } from '../context/FriendRequestsContext';
import { getCallHistory } from '../services/callHistoryService';
import UserProfileDialog from './UserProfileDialog';

export function formatDuration(seconds) {
  const total = Math.round(seconds || 0);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatCallDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CallHistoryModal({ visible, onClose, refreshToken }) {
  const { colors } = useTheme();
  const { getFriendStatus } = useFriendRequests();
  const styles = makeStyles(colors);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
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

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getCallHistory({ limit: 50 })
      .then(({ items }) => { if (!cancelled) setCalls(items); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error ?? err.message ?? 'Failed to load call history.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, refreshToken]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{localize('Call history')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDark} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {loading ? (
              <ActivityIndicator style={styles.stateIndicator} color={colors.misc.text} />
            ) : error ? (
              <Text style={styles.emptyText}>{error}</Text>
            ) : calls.length === 0 ? (
              <Text style={styles.emptyText}>{localize('No calls yet.')}</Text>
            ) : (
              calls.map((call) => (
                <View key={call.id} style={styles.callRow}>
                  <Pressable
                    style={styles.callIcon}
                    onPress={() => call.partnerId && setSelectedUser({
                      accountId: call.partnerId,
                      name: call.partnerName,
                      rating: call.partnerRating,
                      ratingCount: call.partnerRatingCount,
                    })}
                  >
                    <Ionicons name="call" size={16} color={colors.misc.text} />
                  </Pressable>
                  <View style={styles.callInfo}>
                    <View style={styles.callPartnerRow}>
                      <Text style={styles.callPartner} numberOfLines={1}>{call.partnerName}</Text>
                      {getFriendStatus(call.partnerId) === 'friends' ? (
                        <View style={styles.friendsPill}>
                          <Ionicons name="checkmark-circle" size={12} color="#2f9e44" />
                          <Text style={styles.friendsPillText}>{localize('Friends')}</Text>
                        </View>
                      ) : getFriendStatus(call.partnerId) === 'outgoing' ? (
                        <View style={styles.requestedPill}>
                          <Ionicons name="paper-plane-outline" size={11} color="#2b8aa0" />
                          <Text style={styles.requestedPillText}>{localize('Requested')}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.callMeta}>{formatCallDate(call.startedAt)}</Text>
                    {call.myRating ? (
                      <View style={styles.myRatingRow}>
                        <Text style={styles.myRatingText}>{localizeFormat('You rated this {0}', [call.myRating])}</Text>
                        <Ionicons name="star" size={11} color="#f5b942" />
                        <Text style={styles.myRatingText}>{localize('for this call')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.callDuration}>{formatDuration(call.durationSeconds)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <UserProfileDialog
        visible={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '900', color: colors.textDark },
  list: { marginTop: 14 },
  listContent: { paddingBottom: 4 },
  stateIndicator: { marginTop: 20 },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  callIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.misc.bg,
  },
  callInfo: { flex: 1 },
  callPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callPartner: { fontSize: 15, fontWeight: '700', color: colors.textDark, flexShrink: 1 },
  friendsPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(47,158,68,0.12)' },
  friendsPillText: { color: '#2f9e44', fontSize: 10, fontWeight: '800' },
  requestedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(98,214,238,0.16)' },
  requestedPillText: { color: '#2b8aa0', fontSize: 10, fontWeight: '800' },
  callMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  myRatingRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  myRatingText: { fontSize: 11, fontWeight: '700', color: '#9a8a5a' },
  callDuration: { fontSize: 14, fontWeight: '700', color: colors.textDark },
});
