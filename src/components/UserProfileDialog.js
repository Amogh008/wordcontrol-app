import { localize } from '../locales';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFriendRequests } from '../context/FriendRequestsContext';
import PopIn from './PopIn';

function StarRow({ value, size = 14 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color="#f5b942" />
      ))}
    </View>
  );
}

// user: { accountId, name, rating, ratingCount }. accountId is the User
// document id (not the language-profile id) - it's what the friends API
// keys off of. rating/ratingCount are that user's overall call rating.
export default function UserProfileDialog({ visible, onClose, user }) {
  const { colors } = useTheme();
  const { getFriendStatus, sendRequest, acceptRequest } = useFriendRequests();
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptHovered, setAcceptHovered] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const status = getFriendStatus(user.accountId);

  const handleSendRequest = async () => {
    setSending(true);
    setError('');
    try {
      await sendRequest(user.accountId);
    } catch (requestError) {
      setError(requestError.response?.data?.error || localize('Could not send friend request.'));
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await acceptRequest(user.accountId);
    } catch (requestError) {
      setError(requestError.response?.data?.error || localize('Could not accept friend request.'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <PopIn visible={visible} style={styles.popInWrap}>
          <Pressable style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => {}}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textDark} />
            </Pressable>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user.name || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={[styles.name, { color: colors.textDark }]} numberOfLines={1}>{user.name}</Text>

            {user.rating != null ? (
              <View style={styles.ratingBlock}>
                <StarRow value={user.rating} />
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  {user.rating.toFixed(1)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.ratingText, { color: colors.textMuted, marginTop: 10 }]}>
                {localize('No ratings yet.')}
              </Text>
            )}

            {status === 'friends' ? (
              <View style={styles.friendsPill}>
                <Ionicons name="checkmark-circle" size={16} color="#2f9e44" />
                <Text style={styles.friendsPillText}>{localize('Friends')}</Text>
              </View>
            ) : status === 'outgoing' ? (
              <View style={styles.pendingPill}>
                <Ionicons name="paper-plane-outline" size={13} color="#2b8aa0" />
                <Text style={styles.pendingPillText}>{localize('Requested')}</Text>
              </View>
            ) : status === 'incoming' ? (
              <Pressable
                style={[styles.acceptButton, accepting && styles.disabled]}
                onPress={handleAccept}
                onHoverIn={() => setAcceptHovered(true)}
                onHoverOut={() => setAcceptHovered(false)}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#8a6d1a" />
                ) : (
                  <Ionicons name="mail-unread-outline" size={18} color={acceptHovered ? '#ffd43b' : '#8a6d1a'} />
                )}
                <Text style={[styles.acceptButtonText, acceptHovered && styles.acceptButtonTextHovered]}>
                  {localize('Accept request')}
                </Text>
              </Pressable>
            ) : user.accountId ? (
              <Pressable
                style={[styles.addButton, sending && styles.disabled]}
                onPress={handleSendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#155a6a" />
                ) : (
                  <Ionicons name="person-add-outline" size={18} color="#155a6a" />
                )}
                <Text style={styles.addButtonText}>{localize('Add friend')}</Text>
              </Pressable>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Pressable>
        </PopIn>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.78)' },
  popInWrap: { width: '100%', maxWidth: 320, alignItems: 'center' },
  card: { position: 'relative', width: '100%', alignItems: 'center', padding: 24, borderWidth: 1, borderRadius: 20 },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  avatarText: { color: '#155a6a', fontSize: 26, fontWeight: '900' },
  name: { marginTop: 12, fontSize: 18, fontWeight: '900', maxWidth: '100%' },
  ratingBlock: { marginTop: 10, alignItems: 'center', gap: 4 },
  starRow: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700' },
  friendsPill: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(47,158,68,0.12)' },
  friendsPillText: { color: '#2f9e44', fontSize: 12, fontWeight: '900' },
  pendingPill: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(98,214,238,0.16)' },
  pendingPillText: { color: '#2b8aa0', fontSize: 12, fontWeight: '800' },
  addButton: { marginTop: 16, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  addButtonText: { color: '#155a6a', fontSize: 13, fontWeight: '900' },
  acceptButton: { marginTop: 16, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 12, backgroundColor: 'rgba(255, 212, 59, 0.18)', borderWidth: 1, borderColor: 'rgba(255, 212, 59, 0.5)' },
  acceptButtonText: { color: '#8a6d1a', fontSize: 13, fontWeight: '900' },
  acceptButtonTextHovered: { color: '#ffd43b' },
  disabled: { opacity: 0.6 },
  error: { marginTop: 10, color: '#c92a2a', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
