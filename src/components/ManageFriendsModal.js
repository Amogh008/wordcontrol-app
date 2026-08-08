import { localize } from '../locales';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as friendsService from '../services/friendsService';
import NestedConfirmDialog from './NestedConfirmDialog';
import PopIn from './PopIn';

export default function ManageFriendsModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await friendsService.getFriends();
      setFriends(data.friends || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || localize('Could not load your friends.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await friendsService.removeFriend(pendingRemoval.id);
      setFriends((current) => current.filter((friend) => friend.id !== pendingRemoval.id));
      setPendingRemoval(null);
    } catch (removeError) {
      setError(removeError.response?.data?.error || localize('Could not remove this friend.'));
      setPendingRemoval(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => {}}>
        <PopIn visible={visible} style={styles.popInWrap}>
        <Pressable style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textDark }]}>{localize('Manage friends')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={23} color={colors.textDark} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.textDark} />
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : friends.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={30} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {localize('You have not added any friends yet.')}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {friends.map((friend) => (
                <View key={friend.id} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(friend.name || friend.email || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowName, { color: colors.textDark }]} numberOfLines={1}>
                      {friend.name || friend.email}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => setPendingRemoval(friend)}
                    accessibilityLabel={localize('Remove friend')}
                  >
                    <Ionicons name="person-remove-outline" size={18} color="#9f1f1f" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
        </PopIn>

        <NestedConfirmDialog
          visible={Boolean(pendingRemoval)}
          title={localize('Remove this friend?')}
          message={localize('They will be removed from your friends list on this language profile.')}
          cancelText={localize('Cancel')}
          confirmText={localize('Remove')}
          destructive
          loading={removing}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoval}
        />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.78)' },
  popInWrap: { width: '100%', maxWidth: 420, maxHeight: '78%', alignItems: 'center' },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', borderWidth: 1, borderRadius: 22, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '900' },
  loading: { paddingVertical: 30, alignItems: 'center' },
  error: { marginTop: 16, color: '#c92a2a', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  list: { marginTop: 14 },
  listContent: { gap: 10, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  avatarText: { color: '#155a6a', fontSize: 16, fontWeight: '900' },
  rowCopy: { flex: 1, marginLeft: 11, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '800' },
  removeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,42,42,0.1)' },
});
