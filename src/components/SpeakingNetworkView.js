import { localize, localizeFormat } from "../locales";import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../services/apiClient';
import { createRealtimeConnection } from '../services/realtimeService';
import MatchmakingModal from './MatchmakingModal';
import { useLanguageProfile } from '../context/LanguageProfileContext';

export default function SpeakingNetworkView({ onExit }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { activeProfile } = useLanguageProfile();
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
      setError(localizeFormat("Could not connect to the network: {0} ({1})", [


      reason, API_BASE_URL])
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
      setError(localize(


        'Your availability was moved to another device.')
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
        result?.code === 'ACTIVE_CALL' ? localize(


          'Availability cannot be moved during an active call.') : localize(
          'Could not move availability.')
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
        setError(result?.error || localize('Could not start matching.'));
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
    in_call: localize('On call'),
    matched: localize('Getting ready'),
    searching: localize('Searching'),
    available: localize('Ready to practise'),
    online: localize('Online')
  })[status] || localize('Online');

  const others = onlineUsers.filter((onlineUser) => onlineUser.id !== activeProfile?.id);
  const connected = connectionState === 'connected';

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, !onExit && styles.topBarStandalone]}>
        {onExit ?
        <Pressable onPress={onExit} hitSlop={8} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textDark} />
            <Text style={styles.backText}>{localize('Games')}</Text>
          </Pressable> :
        <View />}
        <View style={styles.connectionPill}>
          <View style={[styles.connectionDot, connected && styles.connectionDotOnline]} />
          <Text style={styles.connectionText}>
            {connectionState === 'connecting' ? localize(
              'Connecting…') :
            connected ? localize(
              'Connected') : localize(
              'Disconnected')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <View>
              <Text style={styles.cardTitle}>{localize('Available now')}</Text>
              <Text style={styles.cardSubtitle}>
                {localize('Others can see that you are ready to practise.')}
              </Text>
            </View>
            <Pressable
              onPress={toggleAvailability}
              disabled={!connected || !!match || availableElsewhere}
              accessibilityRole="switch"
              accessibilityState={{ checked: available, disabled: !connected || !!match || availableElsewhere }}
              style={[styles.switchTrack, available && styles.switchTrackActive, (!connected || !!match || availableElsewhere) && styles.disabled]}>

              <View style={[styles.switchThumb, available && styles.switchThumbActive]} />
            </Pressable>
          </View>
        </View>

        {availableElsewhere ?
        <View style={styles.elsewhereCard}>
            <View style={styles.elsewhereIcon}>
              <Ionicons name="phone-portrait-outline" size={22} color="#8a5a00" />
            </View>
            <View style={styles.elsewhereCopy}>
              <Text style={styles.elsewhereTitle}>
                {callElsewhere ? localize(


                'You already have an active call on another login or device') : localize(


                'You already turned on your online availability from another login or device')}
              </Text>
              <Text style={styles.elsewhereText}>
                {callElsewhere ? localize(


                'Move the ongoing call and your availability to this device.') : localize(


                'Only one device can receive connections at a time.')}
              </Text>
            </View>
            <Pressable style={styles.moveButton} onPress={moveAvailabilityHere}>
              <Text style={styles.moveButtonText}>
                {callElsewhere ? localize(
                'Move call here') : localize(
                'Move here')}
              </Text>
            </Pressable>
          </View> :
        null}

        <Pressable
          style={[
          styles.matchButton,
          matching && styles.matchButtonSearching,
          (!available || !connected || !!match || availableElsewhere) && styles.disabled]
          }
          onPress={() => setSearchOpen(true)}
          disabled={!available || !connected || !!match || availableElsewhere}>

          {matching ? <ActivityIndicator size="small" color="#155a6a" /> : <Ionicons name="shuffle" size={21} color="#155a6a" />}
          <View style={styles.matchCopy}>
            <Text style={styles.matchTitle}>
              {matching ? localize(
                'Finding a partner…') : localize(
                'Random connect')}
            </Text>
            <Text style={styles.matchSubtitle}>
              {matching ? localize(
                'Tap again to cancel.') : localize(
                'Connect with an available learner.')}
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{localize('Now online')}</Text>
          <Text style={styles.count}>{others.length}</Text>
        </View>
        <View style={styles.card}>
          {others.length === 0 ?
          <View style={styles.emptyState}>
              <Ionicons name="moon-outline" size={24} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{localize('Nobody available yet')}</Text>
              <Text style={styles.emptyText}>
                {localize('Invite a friend or check again later.')}
              </Text>
            </View> :

          others.map((onlineUser, index) =>
          <View key={onlineUser.id} style={[styles.userRow, index > 0 && styles.userRowBorder]}>
                <View style={styles.avatar}>
                  {onlineUser.avatar ?
              <Image source={{ uri: onlineUser.avatar }} style={styles.avatarImage} /> :
              <Text style={styles.avatarText}>{onlineUser.name.slice(0, 1).toUpperCase()}</Text>}
                  {onlineUser.status === 'in_call' ?
              <View style={styles.callBadge}>
                      <Ionicons name="call" size={8} color="#fff" />
                    </View> :

              <View style={styles.onlineBadge} />
              }
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
              color={onlineUser.status === 'in_call' ? '#e67700' : colors.misc.text} />

              </View>
          )
          }
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{localize('Friends online')}</Text>
          <Text style={styles.count}>{localize("0")}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            {localize(

              'Friend connections will be enabled after the first successful conversation flow.')}
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
        onFinished={finishCall} />

    </View>);

}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  topBarStandalone: { justifyContent: 'flex-start' },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d9485f' },
  connectionDotOnline: { backgroundColor: '#2f9e44' },
  connectionText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  content: { paddingTop: 8, paddingBottom: 32, gap: 14 },
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
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: colors.misc.text, fontSize: 16, fontWeight: '900' },
  onlineBadge: { position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.cardBg, backgroundColor: '#2f9e44' },
  callBadge: { position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cardBg, backgroundColor: '#e67700' },
  userCopy: { flex: 1, marginLeft: 11 },
  userName: { color: colors.textDark, fontSize: 14, fontWeight: '800' },
  userStatus: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
  userStatusOnCall: { color: '#e67700', fontWeight: '800' }
});
