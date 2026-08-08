import { localize, localizeFormat } from "../locales";import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useFriendRequests } from '../context/FriendRequestsContext';
import NestedConfirmDialog from './NestedConfirmDialog';
import UserProfileDialog from './UserProfileDialog';
import { createAudioCallCipher } from '../services/audioCipher';
import { createAudioCallTransport } from '../services/audioTransport';
import { rateCall } from '../services/callHistoryService';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function WebAudioCall({ socket, match, selectedDeviceId, onFinished }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { getFriendStatus, sendRequest, acceptRequest } = useFriendRequests();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const partnerFriendStatus = getFriendStatus(match.partner.accountId);
  const [friendActionState, setFriendActionState] = useState('idle'); // idle | sending | error
  const [friendActionError, setFriendActionError] = useState('');
  const [acceptHovered, setAcceptHovered] = useState(false);
  const transportRef = useRef(null);
  const cipherRef = useRef(null);
  const pendingSignalsRef = useRef([]);
  const readySentRef = useRef(false);
  const e2eeTimerRef = useRef(null);
  const returnProgress = useRef(new Animated.Value(1)).current;
  const transferStartedRef = useRef(false);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);
  const [state, setState] = useState('matched');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [remoteEnd, setRemoteEnd] = useState(null);
  const [returnCountdown, setReturnCountdown] = useState(20);
  const [partnerProfileOpen, setPartnerProfileOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingState, setRatingState] = useState('idle'); // idle | sending | sent | error
  const [ratingError, setRatingError] = useState('');

  const submitRating = useCallback(async (score) => {
    if (ratingState === 'sending' || ratingState === 'sent') return;
    setRatingScore(score);
    setRatingState('sending');
    setRatingError('');
    try {
      await rateCall(match.callId, score);
      setRatingState('sent');
    } catch (rateError) {
      setRatingState('error');
      setRatingError(rateError.response?.data?.error || localize('Could not submit rating.'));
    }
  }, [match.callId, ratingState]);

  const handleSendFriendRequest = useCallback(async () => {
    setFriendActionState('sending');
    setFriendActionError('');
    try {
      await sendRequest(match.partner.accountId);
      setFriendActionState('idle');
    } catch (requestError) {
      setFriendActionState('error');
      setFriendActionError(requestError.response?.data?.error || localize('Could not send friend request.'));
    }
  }, [match.partner.accountId, sendRequest]);

  const handleAcceptFriendRequest = useCallback(async () => {
    setFriendActionState('sending');
    setFriendActionError('');
    try {
      await acceptRequest(match.partner.accountId);
      setFriendActionState('idle');
    } catch (requestError) {
      setFriendActionState('error');
      setFriendActionError(requestError.response?.data?.error || localize('Could not accept friend request.'));
    }
  }, [acceptRequest, match.partner.accountId]);

  const cleanupMedia = useCallback(() => {
    transportRef.current?.stopCapture();
    transportRef.current?.stopPlayback();
    transportRef.current?.close();
    transportRef.current = null;
    cipherRef.current?.destroy();
    cipherRef.current = null;
    pendingSignalsRef.current = [];
    if (e2eeTimerRef.current) clearTimeout(e2eeTimerRef.current);
    e2eeTimerRef.current = null;
    readySentRef.current = false;
    audioStartedRef.current = false;
  }, []);

  const markEncryptedCallReady = useCallback(() => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    if (e2eeTimerRef.current) clearTimeout(e2eeTimerRef.current);
    e2eeTimerRef.current = null;
    setState('waiting');
    socket.emit('call:ready', { callId: match.callId }, (result) => {
      if (!result?.ok) {
        setError(result?.error || 'Call is no longer available.');
        setState('failed');
        cleanupMedia();
      }
    });
  }, [cleanupMedia, match.callId, socket]);

  const startAudioPipeline = useCallback(async () => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    const transport = transportRef.current;
    const cipher = cipherRef.current;
    if (!transport || !cipher) return;
    try {
      await transport.startPlayback();
      await transport.startCapture(selectedDeviceId, (pcmChunk) => {
        if (mutedRef.current) return;
        try {
          transport.send(cipher.encryptChunk(pcmChunk));
        } catch (encryptError) {
          // Drop this chunk; the call keeps running on the next one.
        }
      });
      setState('active');
    } catch (audioError) {
      setError(audioError.message || localize('Could not open the microphone.'));
      setState('failed');
      cleanupMedia();
    }
  }, [cleanupMedia, selectedDeviceId]);

  const applySignal = useCallback((signal) => {
    const transport = transportRef.current;
    if (!transport) return;
    if (signal.type === 'description') {
      transport.setRemoteDescription(signal.description).then(async () => {
        if (signal.description.type === 'offer') {
          const answer = await transport.createAnswer();
          socket.emit('call:signal', { callId: match.callId, signal: { type: 'description', description: answer } });
        }
      }).catch(() => {
        setError(localize('Could not establish the audio connection.'));
        setState('failed');
        cleanupMedia();
      });
    } else if (signal.type === 'candidate' && signal.candidate) {
      transport.addIceCandidate(signal.candidate).catch(() => {});
    }
  }, [cleanupMedia, match.callId, socket]);

  useEffect(() => {
    const handleStart = async ({ callId, initiator }) => {
      if (callId !== match.callId || !cipherRef.current) return;
      setState('connecting');
      try {
        const transport = await createAudioCallTransport({
          iceServers: ICE_SERVERS,
          onIceCandidate: (candidate) => {
            socket.emit('call:signal', { callId: match.callId, signal: { type: 'candidate', candidate } });
          },
          onDataChannelOpen: () => {
            startAudioPipeline();
          },
          onDataChannelMessage: (bytes) => {
            if (!cipherRef.current) return;
            try {
              transportRef.current?.playChunk(cipherRef.current.decryptChunk(bytes));
            } catch (decryptError) {
              // Drop this chunk.
            }
          },
          onConnectionStateChange: (connectionState) => {
            if (['failed', 'disconnected'].includes(connectionState)) setState('failed');
          },
        });
        transportRef.current = transport;
        transport.isInitiator(initiator);
        if (initiator) {
          const offer = await transport.createOffer();
          socket.emit('call:signal', { callId: match.callId, signal: { type: 'description', description: offer } });
        }
        const queued = pendingSignalsRef.current.splice(0);
        queued.forEach(applySignal);
      } catch (startError) {
        setError(startError.message);
        setState('failed');
      }
    };

    const handleSignal = async ({ callId, signal }) => {
      if (callId !== match.callId || !signal) return;
      try {
        if (signal.type === 'e2ee-key-request') {
          if (!cipherRef.current) return;
          cipherRef.current.acceptRemotePublicKey(signal.publicKey);
          socket.emit('call:signal', {
            callId: match.callId,
            signal: { type: 'e2ee-key-response', publicKey: cipherRef.current.localPublicKey }
          });
          markEncryptedCallReady();
          return;
        }
        if (signal.type === 'e2ee-key-response') {
          cipherRef.current?.acceptRemotePublicKey(signal.publicKey);
          markEncryptedCallReady();
          return;
        }

        if (!transportRef.current) {
          pendingSignalsRef.current.push(signal);
          return;
        }
        applySignal(signal);
      } catch (signalError) {
        setError(localize('Could not establish the audio connection.'));
        setState('failed');
        cleanupMedia();
      }
    };

    const handleEnded = ({ callId, reason, endedBy }) => {
      if (callId !== match.callId) return;
      cleanupMedia();
      setState('ended');
      setRemoteEnd({ reason, endedBy });
      setReturnCountdown(10);
    };

    socket.on('call:start', handleStart);
    socket.on('call:signal', handleSignal);
    socket.on('call:ended', handleEnded);
    return () => {
      socket.off('call:start', handleStart);
      socket.off('call:signal', handleSignal);
      socket.off('call:ended', handleEnded);
      socket.emit('call:end', { callId: match.callId });
      cleanupMedia();
    };
  }, [applySignal, cleanupMedia, isDe, markEncryptedCallReady, match.callId, socket, startAudioPipeline]);

  useEffect(() => {
    if (state !== 'ended') return undefined;
    if (returnCountdown <= 0) {
      onFinished({ makeAvailable: true });
      return undefined;
    }
    const timer = setTimeout(() => setReturnCountdown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [onFinished, returnCountdown, state]);

  useEffect(() => {
    if (state !== 'ended') return undefined;
    returnProgress.setValue(1);
    const animation = Animated.timing(returnProgress, {
      toValue: 0,
      duration: 20000,
      useNativeDriver: false
    });
    animation.start();
    return () => animation.stop();
  }, [returnProgress, state]);

  const prepareCall = async () => {
    if (Platform.OS === 'web' && !globalThis.isSecureContext) {
      setError(localize('Microphone access requires HTTPS or localhost.'));
      return;
    }

    try {
      setState('preparing');
      setError('');

      cipherRef.current = createAudioCallCipher({ callId: match.callId });

      setState('securing');
      socket.emit('call:signal', {
        callId: match.callId,
        signal: { type: 'e2ee-key-request', publicKey: cipherRef.current.localPublicKey }
      });
      e2eeTimerRef.current = setTimeout(() => {
        setError(localize('Could not establish the audio connection.'));
        setState('failed');
        cleanupMedia();
      }, 15000);
    } catch (prepareError) {
      setError(prepareError.message || localize('Could not open the microphone.'));
      setState('failed');
      cleanupMedia();
    }
  };

  useEffect(() => {
    if (!match.transferred || transferStartedRef.current) return;
    transferStartedRef.current = true;
    prepareCall();
    // A transferred call reconnects automatically on both participating devices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.transferred]);

  const toggleMute = () => {
    const nextMuted = !muted;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
  };

  const end = () => {
    socket.emit('call:end', { callId: match.callId });
    cleanupMedia();
    setConfirmEnd(false);
    setRemoteEnd(null);
    setReturnCountdown(10);
    setState('ended');
  };

  const statusText = {
    matched: localize('Match found. Confirm when you are ready.'),
    preparing: localize('Preparing microphone…'),
    securing: localize('Connecting audio…'),
    waiting: localize('Waiting for your partner to start…'),
    connecting: localize('Connecting audio…'),
    active: localize('Audio call connected'),
    failed: localize('The audio call could not connect.'),
    ended: remoteEnd ?
    remoteEnd.reason === 'user-ended' ? localizeFormat("Disconnected: {0} ended the call.", [
    remoteEnd.endedBy || 'User']) : localize(
      'Disconnected: Your partner lost the connection.') : localize(
      'Call ended')
  }[state];

  return (
    <View style={styles.card}>
      <View style={styles.partnerRow}>
        <Pressable style={styles.avatar} onPress={() => setPartnerProfileOpen(true)} hitSlop={4}>
          <Text style={styles.avatarText}>{match.partner.name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
        <Pressable style={styles.partnerCopy} onPress={() => setPartnerProfileOpen(true)}>
          <Text style={styles.foundLabel}>{localize('Partner found')}</Text>
          <View style={styles.partnerNameRow}>
            <Text style={styles.partnerName}>{match.partner.name}</Text>
            {partnerFriendStatus === 'friends' ? (
              <View style={styles.friendsPill}>
                <Ionicons name="checkmark-circle" size={12} color="#2f9e44" />
                <Text style={styles.friendsPillText}>{localize('Friends')}</Text>
              </View>
            ) : partnerFriendStatus === 'outgoing' ? (
              <View style={styles.requestedPill}>
                <Ionicons name="paper-plane-outline" size={11} color="#2b8aa0" />
                <Text style={styles.requestedPillText}>{localize('Requested')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.status}>{statusText}</Text>
        </Pressable>
      </View>

      {partnerFriendStatus === 'incoming' ? (
        <Pressable
          style={[styles.acceptButton, friendActionState === 'sending' && styles.disabled]}
          onPress={handleAcceptFriendRequest}
          onHoverIn={() => setAcceptHovered(true)}
          onHoverOut={() => setAcceptHovered(false)}
          disabled={friendActionState === 'sending'}
        >
          {friendActionState === 'sending' ? (
            <ActivityIndicator size="small" color="#8a6d1a" />
          ) : (
            <Ionicons name="mail-unread-outline" size={16} color={acceptHovered ? '#ffd43b' : '#8a6d1a'} />
          )}
          <Text style={[styles.acceptButtonText, acceptHovered && styles.acceptButtonTextHovered]}>
            {localize('Accept request')}
          </Text>
        </Pressable>
      ) : partnerFriendStatus === 'none' && match.partner.accountId ? (
        <Pressable
          style={[styles.addFriendButton, friendActionState === 'sending' && styles.disabled]}
          onPress={handleSendFriendRequest}
          disabled={friendActionState === 'sending'}
        >
          {friendActionState === 'sending' ? (
            <ActivityIndicator size="small" color="#155a6a" />
          ) : (
            <Ionicons name="person-add-outline" size={16} color="#155a6a" />
          )}
          <Text style={styles.addFriendButtonText}>{localize('Add friend')}</Text>
        </Pressable>
      ) : null}

      {friendActionState === 'error' ? <Text style={styles.error}>{friendActionError}</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {state === 'matched' || state === 'failed' ?
      <Pressable style={styles.startButton} onPress={prepareCall}>
          <Ionicons name="call" size={19} color="#155a6a" />
          <Text style={styles.startButtonText}>{localize("I'm ready")}</Text>
        </Pressable> :
      null}

      {['preparing', 'securing', 'waiting', 'connecting'].includes(state) ?
      <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color="#155a6a" />
          <Text style={styles.waitingText}>{statusText}</Text>
        </View> :
      null}

      {state === 'active' ?
      <Text style={styles.encryptedLabel}>
          <Ionicons name="lock-closed" size={10} color={colors.textMuted} /> {localize('End-to-end encrypted')}
        </Text> :
      null}

      {state === 'active' ?
      <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={toggleMute}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={21} color={colors.textDark} />
            <Text style={styles.controlText}>{muted ? localize('Muted') : localize('Microphone')}</Text>
          </Pressable>
          <Pressable style={styles.endButton} onPress={() => setConfirmEnd(true)}>
            <Ionicons name="call" size={21} color="#fff" />
            <Text style={styles.endText}>{localize('End')}</Text>
          </Pressable>
        </View> :
      null}

      {state === 'ended' ?
      <>
          <View style={styles.ratingBlock}>
            <Text style={styles.ratingLabel}>
              {ratingState === 'sent' ?
              localize('Thanks for rating!') :
              localizeFormat('Rate your call with {0}', [match.partner.name])}
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => submitRating(value)}
                  disabled={ratingState === 'sending' || ratingState === 'sent'}
                  hitSlop={6}
                >
                  <Ionicons
                    name={value <= ratingScore ? 'star' : 'star-outline'}
                    size={28}
                    color={value <= ratingScore ? '#f2b705' : colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
            {ratingState === 'error' ? <Text style={styles.error}>{ratingError}</Text> : null}
          </View>

          <Text style={styles.countdownText}>
            {localizeFormat("Returning automatically in {0} seconds.", [

          returnCountdown])}
          </Text>
          <Pressable style={styles.doneButton} onPress={() => onFinished({ makeAvailable: true })}>
            <Animated.View
            pointerEvents="none"
            style={[
            styles.doneButtonProgress,
            {
              width: returnProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }]
            } />

            <Text style={styles.doneText}>
              {localize('Back to network')}
            </Text>
          </Pressable>
        </> :
      null}

      <NestedConfirmDialog
        visible={confirmEnd}
        title={localize('End this call?')}
        message={localizeFormat("{0} will be told that you ended the call.", [match.partner.name])}
        cancelText={localize('Keep talking')}
        confirmText={localize('End call')}
        destructive
        onCancel={() => setConfirmEnd(false)}
        onConfirm={end}
      />

      <UserProfileDialog
        visible={partnerProfileOpen}
        onClose={() => setPartnerProfileOpen(false)}
        user={match.partner}
      />
    </View>);

}

const makeStyles = (colors) => StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.cardBg },
  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  avatarText: { color: '#155a6a', fontSize: 20, fontWeight: '900' },
  partnerCopy: { flex: 1, marginLeft: 12 },
  foundLabel: { color: '#2f9e44', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  partnerNameRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  partnerName: { color: colors.textDark, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  friendsPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(47,158,68,0.12)' },
  friendsPillText: { color: '#2f9e44', fontSize: 10, fontWeight: '800' },
  requestedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(98,214,238,0.16)' },
  requestedPillText: { color: '#2b8aa0', fontSize: 10, fontWeight: '800' },
  status: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  acceptButton: { marginTop: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: 'rgba(255, 212, 59, 0.18)', borderWidth: 1, borderColor: 'rgba(255, 212, 59, 0.5)' },
  acceptButtonText: { color: '#8a6d1a', fontSize: 13, fontWeight: '900' },
  acceptButtonTextHovered: { color: '#ffd43b' },
  addFriendButton: { marginTop: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  addFriendButtonText: { color: '#155a6a', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  error: { marginTop: 12, color: '#c92a2a', fontSize: 12, lineHeight: 17 },
  startButton: { marginTop: 14, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: '#bfeefa' },
  startButtonText: { color: '#155a6a', fontSize: 14, fontWeight: '900' },
  waitingRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  waitingText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  encryptedLabel: { marginTop: 12, color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  controls: { marginTop: 14, flexDirection: 'row', gap: 10 },
  controlButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  controlText: { color: colors.textDark, fontSize: 12, fontWeight: '800' },
  endButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: '#d9485f' },
  endText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  doneButton: { position: 'relative', marginTop: 10, minHeight: 46, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.cardBg },
  doneButtonProgress: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#bfeefa' },
  doneText: { zIndex: 1, color: '#fff', fontSize: 12, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 },
  countdownText: { marginTop: 12, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  ratingBlock: { marginTop: 16, alignItems: 'center' },
  ratingLabel: { color: colors.textDark, fontSize: 13, fontWeight: '800' },
  starRow: { marginTop: 8, flexDirection: 'row', gap: 6 },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(4, 12, 18, 0.78)' },
  confirmCard: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 22, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
  confirmIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe3e3' },
  confirmTitle: { marginTop: 12, color: colors.textDark, fontSize: 19, fontWeight: '900' },
  confirmMessage: { marginTop: 7, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  confirmActions: { width: '100%', marginTop: 18, flexDirection: 'row', gap: 10 },
  keepButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border },
  keepText: { color: colors.textDark, fontSize: 12, fontWeight: '800' },
  confirmEndButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#d9485f' },
  confirmEndText: { color: '#fff', fontSize: 12, fontWeight: '900' }
});
