import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../services/apiClient';
import { createRealtimeConnection } from '../services/realtimeService';
import MatchmakingModal from './MatchmakingModal';

export default function SpeakingNetworkView({ onExit }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const socketRef = useRef(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const [available, setAvailable] = useState(false);
  const [availableElsewhere, setAvailableElsewhere] = useState(false);
  const [callElsewhere, setCallElsewhere] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchTimedOut, setMatchTimedOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = createRealtimeConnection();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      setError('');
    });
    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      setAvailable(false);
      setMatching(false);
    });
    socket.on('connect_error', (connectionError) => {
      setConnectionState('disconnected');
      const reason = connectionError?.message || 'Unknown connection error';
      setError(
        isDe
          ? `Die Verbindung zum Netzwerk ist fehlgeschlagen: ${reason} (${API_BASE_URL})`
          : `Could not connect to the network: ${reason} (${API_BASE_URL})`,
      );
    });
    socket.on('presence:list', (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    });
    socket.on('network:ownership', ({ active, owned, inCall }) => {
      setAvailableElsewhere(active === true && owned !== true);
      setCallElsewhere(active === true && owned !== true && inCall === true);
      if (owned !== true) {
        setAvailable(false);
        setMatching(false);
      }
    });
    socket.on('network:ownership-lost', () => {
      setAvailable(false);
      setAvailableElsewhere(true);
      setMatching(false);
      setMatch(null);
      setSearchOpen(false);
      setError(
        isDe
          ? 'Deine Verfügbarkeit wurde auf ein anderes Gerät verschoben.'
          : 'Your availability was moved to another device.',
      );
    });
    socket.on('match:found', ({ partner, callId, transferred = false }) => {
      setMatching(false);
      setAvailable(false);
      setAvailableElsewhere(false);
      setCallElsewhere(false);
      setMatch({ partner, callId, transferred });
      setSearchOpen(true);
      setMatchTimedOut(false);
    });
    socket.on('match:timeout', () => {
      setMatching(false);
      setMatchTimedOut(true);
      setSearchOpen(true);
    });

    return () => {
      socket.emit('match:leave');
      socket.emit('presence:set-availability', false);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isDe]);

  const toggleAvailability = () => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const next = !available;
    if (!next) {
      socket.emit('match:leave');
      setMatching(false);
      setMatch(null);
    }
    socket.emit('presence:set-availability', next, (result) => {
      if (result?.ok) {
        setAvailable(result.available);
        setAvailableElsewhere(result.elsewhere === true);
      } else if (result?.code === 'AVAILABLE_ELSEWHERE') {
        setAvailableElsewhere(true);
      }
    });
  };

  const moveAvailabilityHere = () => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    setError('');
    socket.emit('presence:move-availability', (result) => {
      if (result?.ok) {
        setAvailable(result.available === true);
        setAvailableElsewhere(false);
        setCallElsewhere(false);
        return;
      }
      setError(
        result?.code === 'ACTIVE_CALL'
          ? (isDe
              ? 'Die Verfügbarkeit kann während eines aktiven Gesprächs nicht verschoben werden.'
              : 'Availability cannot be moved during an active call.')
          : (isDe ? 'Verfügbarkeit konnte nicht verschoben werden.' : 'Could not move availability.'),
      );
    });
  };

  const startMatching = () => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    setMatch(null);
    setMatchTimedOut(false);
    setError('');
    socket.emit('match:join', (result) => {
      if (!result?.ok) {
        setError(result?.error || (isDe ? 'Matching konnte nicht gestartet werden.' : 'Could not start matching.'));
        return;
      }
      setMatching(result.waiting === true);
    });
  };

  const cancelMatching = () => {
    const socket = socketRef.current;
    socket?.emit('match:leave');
    if (match) socket?.emit('call:end', { callId: match.callId });
    setMatching(false);
    setMatch(null);
    setMatchTimedOut(false);
    setSearchOpen(false);
  };

  const finishCall = ({ makeAvailable = false } = {}) => {
    setMatch(null);
    setSearchOpen(false);
    setMatchTimedOut(false);
    if (makeAvailable && socketRef.current?.connected) {
      socketRef.current.emit('presence:set-availability', true, (result) => {
        if (result?.ok) setAvailable(true);
      });
    }
  };

  const statusLabel = (status) => ({
    in_call: isDe ? 'Im Gespräch' : 'On call',
    matched: isDe ? 'Macht sich bereit' : 'Getting ready',
    searching: isDe ? 'Sucht einen Partner' : 'Searching',
    available: isDe ? 'Bereit zum Üben' : 'Ready to practise',
    online: isDe ? 'Online' : 'Online',
  }[status] || (isDe ? 'Online' : 'Online'));

  const others = onlineUsers.filter((onlineUser) => onlineUser.id !== user?.id);
  const connected = connectionState === 'connected';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={8} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.textDark} />
          <Text style={styles.backText}>{isDe ? 'Spiele' : 'Games'}</Text>
        </Pressable>
        <View style={styles.connectionPill}>
          <View style={[styles.connectionDot, connected && styles.connectionDotOnline]} />
          <Text style={styles.connectionText}>
            {connectionState === 'connecting'
              ? (isDe ? 'Verbinden…' : 'Connecting…')
              : connected
                ? (isDe ? 'Verbunden' : 'Connected')
                : (isDe ? 'Getrennt' : 'Disconnected')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={30} color="#155a6a" />
          </View>
          <Text style={styles.heroTitle}>{isDe ? 'Sprech-Netzwerk' : 'Speaking Network'}</Text>
          <Text style={styles.heroSubtitle}>
            {isDe
              ? 'Finde Lernpartner, übe Deutsch und knüpfe neue Kontakte.'
              : 'Find learning partners, practise German and make new connections.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <View>
              <Text style={styles.cardTitle}>{isDe ? 'Jetzt verfügbar' : 'Available now'}</Text>
              <Text style={styles.cardSubtitle}>
                {isDe ? 'Andere können dich sehen und mit dir üben.' : 'Others can see that you are ready to practise.'}
              </Text>
            </View>
            <Pressable
              onPress={toggleAvailability}
              disabled={!connected || !!match || availableElsewhere}
              accessibilityRole="switch"
              accessibilityState={{ checked: available, disabled: !connected || !!match || availableElsewhere }}
              style={[styles.switchTrack, available && styles.switchTrackActive, (!connected || !!match || availableElsewhere) && styles.disabled]}
            >
              <View style={[styles.switchThumb, available && styles.switchThumbActive]} />
            </Pressable>
          </View>
        </View>

        {availableElsewhere ? (
          <View style={styles.elsewhereCard}>
            <View style={styles.elsewhereIcon}>
              <Ionicons name="phone-portrait-outline" size={22} color="#8a5a00" />
            </View>
            <View style={styles.elsewhereCopy}>
              <Text style={styles.elsewhereTitle}>
                {callElsewhere
                  ? (isDe
                      ? 'Du führst bereits ein Gespräch auf einem anderen Gerät oder Login'
                      : 'You already have an active call on another login or device')
                  : (isDe
                      ? 'Du hast deine Online-Verfügbarkeit bereits auf einem anderen Gerät oder Login aktiviert'
                      : 'You already turned on your online availability from another login or device')}
              </Text>
              <Text style={styles.elsewhereText}>
                {callElsewhere
                  ? (isDe
                      ? 'Verschiebe das laufende Gespräch und deine Verfügbarkeit auf dieses Gerät.'
                      : 'Move the ongoing call and your availability to this device.')
                  : (isDe
                      ? 'Nur ein Gerät kann gleichzeitig Verbindungen empfangen.'
                      : 'Only one device can receive connections at a time.')}
              </Text>
            </View>
            <Pressable style={styles.moveButton} onPress={moveAvailabilityHere}>
              <Text style={styles.moveButtonText}>
                {callElsewhere
                  ? (isDe ? 'Gespräch hierher' : 'Move call here')
                  : (isDe ? 'Hierher verschieben' : 'Move here')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.matchButton,
            matching && styles.matchButtonSearching,
            (!available || !connected || !!match || availableElsewhere) && styles.disabled,
          ]}
          onPress={() => setSearchOpen(true)}
          disabled={!available || !connected || !!match || availableElsewhere}
        >
          {matching ? <ActivityIndicator size="small" color="#155a6a" /> : <Ionicons name="shuffle" size={21} color="#155a6a" />}
          <View style={styles.matchCopy}>
            <Text style={styles.matchTitle}>
              {matching
                ? (isDe ? 'Partner wird gesucht…' : 'Finding a partner…')
                : (isDe ? 'Zufällig verbinden' : 'Random connect')}
            </Text>
            <Text style={styles.matchSubtitle}>
              {matching
                ? (isDe ? 'Tippe erneut, um abzubrechen.' : 'Tap again to cancel.')
                : (isDe ? 'Mit einem verfügbaren Lernenden verbinden.' : 'Connect with an available learner.')}
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isDe ? 'Jetzt online' : 'Now online'}</Text>
          <Text style={styles.count}>{others.length}</Text>
        </View>
        <View style={styles.card}>
          {others.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="moon-outline" size={24} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{isDe ? 'Noch niemand verfügbar' : 'Nobody available yet'}</Text>
              <Text style={styles.emptyText}>
                {isDe ? 'Lade einen Freund ein oder versuche es später erneut.' : 'Invite a friend or check again later.'}
              </Text>
            </View>
          ) : (
            others.map((onlineUser, index) => (
              <View key={onlineUser.id} style={[styles.userRow, index > 0 && styles.userRowBorder]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{onlineUser.name.slice(0, 1).toUpperCase()}</Text>
                  {onlineUser.status === 'in_call' ? (
                    <View style={styles.callBadge}>
                      <Ionicons name="call" size={8} color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.onlineBadge} />
                  )}
                </View>
                <View style={styles.userCopy}>
                  <Text style={styles.userName}>{onlineUser.name}</Text>
                  <Text style={[styles.userStatus, onlineUser.status === 'in_call' && styles.userStatusOnCall]}>
                    {statusLabel(onlineUser.status)}
                  </Text>
                </View>
                <Ionicons
                  name={onlineUser.status === 'in_call' ? 'call' : 'headset-outline'}
                  size={20}
                  color={onlineUser.status === 'in_call' ? '#e67700' : colors.misc.text}
                />
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isDe ? 'Freunde online' : 'Friends online'}</Text>
          <Text style={styles.count}>0</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            {isDe
              ? 'Freundschaften werden nach dem ersten erfolgreichen Gespräch aktiviert.'
              : 'Friend connections will be enabled after the first successful conversation flow.'}
          </Text>
        </View>
      </ScrollView>

      <MatchmakingModal
        visible={searchOpen}
        socket={socketRef.current}
        matching={matching}
        match={match}
        timedOut={matchTimedOut}
        onStartSearch={startMatching}
        onRetry={startMatching}
        onCancel={cancelMatching}
        onFinished={finishCall}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d9485f' },
  connectionDotOnline: { backgroundColor: '#2f9e44' },
  connectionText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  content: { paddingTop: 8, paddingBottom: 32, gap: 14 },
  hero: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  heroTitle: { marginTop: 12, color: colors.textDark, fontSize: 24, fontWeight: '800' },
  heroSubtitle: { marginTop: 6, color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 420 },
  card: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  cardTitle: { color: colors.textDark, fontSize: 15, fontWeight: '800' },
  cardSubtitle: { marginTop: 3, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  elsewhereCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#e0ad45', backgroundColor: '#fff3bf' },
  elsewhereIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe8a1' },
  elsewhereCopy: { flex: 1 },
  elsewhereTitle: { color: '#704800', fontSize: 12, fontWeight: '900' },
  elsewhereText: { marginTop: 2, color: '#8a5a00', fontSize: 10, lineHeight: 14 },
  moveButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#ffd66b' },
  moveButtonText: { color: '#704800', fontSize: 10, fontWeight: '900' },
  switchTrack: { width: 48, height: 28, borderRadius: 15, padding: 3, backgroundColor: colors.border },
  switchTrackActive: { backgroundColor: '#62d6ee' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  switchThumbActive: { transform: [{ translateX: 20 }] },
  disabled: { opacity: 0.45 },
  matchButton: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 14, padding: 16, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  matchButtonSearching: { backgroundColor: '#d9f7fc' },
  matchCopy: { flex: 1 },
  matchTitle: { color: '#155a6a', fontSize: 15, fontWeight: '900' },
  matchSubtitle: { marginTop: 3, color: '#397987', fontSize: 12 },
  error: { color: '#c92a2a', fontSize: 12, fontWeight: '600' },
  sectionHeader: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textDark, fontSize: 16, fontWeight: '800' },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 12 },
  emptyTitle: { marginTop: 8, color: colors.textDark, fontSize: 14, fontWeight: '800' },
  emptyText: { marginTop: 4, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  userRowBorder: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { position: 'relative', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.misc.bg },
  avatarText: { color: colors.misc.text, fontSize: 16, fontWeight: '900' },
  onlineBadge: { position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.cardBg, backgroundColor: '#2f9e44' },
  callBadge: { position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cardBg, backgroundColor: '#e67700' },
  userCopy: { flex: 1, marginLeft: 11 },
  userName: { color: colors.textDark, fontSize: 14, fontWeight: '800' },
  userStatus: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
  userStatusOnCall: { color: '#e67700', fontWeight: '800' },
});
