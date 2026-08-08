import { localize } from '../locales';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFriendRequests } from '../context/FriendRequestsContext';
import PopIn from './PopIn';

export default function NotificationBell({ style }) {
  const { colors } = useTheme();
  const { incoming, unreadCount, acceptRequest, rejectRequest } = useFriendRequests();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const respond = async (friendId, action) => {
    setBusyId(friendId);
    try {
      if (action === 'accept') await acceptRequest(friendId);
      else await rejectRequest(friendId);
    } catch (error) {
      // Leave the request in the list; the user can retry.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={localize('Friend requests')}
        style={[styles.bellButton, { backgroundColor: colors.cardBg, borderColor: colors.border }, style]}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.textDark} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <PopIn visible={open} style={styles.popInWrap}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textDark }]}>{localize('Friend requests')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textDark} />
              </Pressable>
            </View>

            {incoming.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={30} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {localize('No new friend requests.')}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {incoming.map((request) => (
                  <View key={request.id} style={[styles.row, { borderColor: colors.border }]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(request.name || request.email || '?').slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowName, { color: colors.textDark }]} numberOfLines={1}>
                        {request.name || request.email}
                      </Text>
                      <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                        {localize('Wants to be your friend')}
                      </Text>
                    </View>
                    {busyId === request.id ? (
                      <ActivityIndicator size="small" color={colors.textDark} />
                    ) : (
                      <View style={styles.actions}>
                        <Pressable style={styles.rejectButton} onPress={() => respond(request.id, 'reject')}>
                          <Ionicons name="close" size={18} color="#9f1f1f" />
                        </Pressable>
                        <Pressable style={styles.acceptButton} onPress={() => respond(request.id, 'accept')}>
                          <Ionicons name="checkmark" size={18} color="#155a6a" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
          </PopIn>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'absolute',
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9485f',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  backdrop: { flex: 1, alignItems: 'flex-end', padding: 14, backgroundColor: 'rgba(4, 12, 18, 0.6)' },
  popInWrap: { width: '100%', maxWidth: 360, maxHeight: '70%', marginTop: 56, alignItems: 'flex-end' },
  sheet: { width: '100%', maxWidth: 360, maxHeight: '100%', borderWidth: 1, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 26, gap: 8 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  list: { marginTop: 10 },
  listContent: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  avatarText: { color: '#155a6a', fontSize: 15, fontWeight: '900' },
  rowCopy: { flex: 1, marginLeft: 10, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: '800' },
  rowSubtitle: { marginTop: 2, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8 },
  rejectButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,42,42,0.12)' },
  acceptButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
});
