import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function WebAudioCall({ socket, match, selectedDeviceId, onFinished }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const audioElementRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const returnProgress = useRef(new Animated.Value(1)).current;
  const transferStartedRef = useRef(false);
  const [state, setState] = useState('matched');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [remoteEnd, setRemoteEnd] = useState(null);
  const [returnCountdown, setReturnCountdown] = useState(10);

  const cleanupMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingCandidatesRef.current = [];
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
  }, []);

  const flushCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer?.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const sendDescription = useCallback(async (description) => {
    const peer = peerRef.current;
    if (!peer) return;
    await peer.setLocalDescription(description);
    socket.emit('call:signal', {
      callId: match.callId,
      signal: { type: 'description', description: peer.localDescription.toJSON() },
    });
  }, [match.callId, socket]);

  useEffect(() => {
    const handleStart = async ({ callId, initiator }) => {
      if (callId !== match.callId || !peerRef.current) return;
      setState('connecting');
      if (initiator) {
        try {
          await sendDescription(await peerRef.current.createOffer());
        } catch (startError) {
          setError(startError.message);
          setState('failed');
        }
      }
    };

    const handleSignal = async ({ callId, signal }) => {
      if (callId !== match.callId || !peerRef.current) return;
      try {
        if (signal.type === 'description') {
          await peerRef.current.setRemoteDescription(signal.description);
          await flushCandidates();
          if (signal.description.type === 'offer') {
            await sendDescription(await peerRef.current.createAnswer());
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(signal.candidate);
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (signalError) {
        setError(signalError.message);
        setState('failed');
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
  }, [cleanupMedia, flushCandidates, isDe, match.callId, sendDescription, socket]);

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
      duration: 10000,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [returnProgress, state]);

  const prepareCall = async () => {
    if (Platform.OS !== 'web') {
      setError(isDe ? 'Native Audioanrufe benötigen den nächsten Expo-Build-Schritt.' : 'Native audio calls require the next Expo build step.');
      return;
    }
    if (!globalThis.isSecureContext) {
      setError(
        isDe
          ? 'Mikrofonzugriff benötigt HTTPS oder localhost.'
          : 'Microphone access requires HTTPS or localhost.',
      );
      return;
    }

    try {
      setState('preparing');
      setError('');
      const audio = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      streamRef.current = stream;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        socket.emit('call:signal', {
          callId: match.callId,
          signal: { type: 'candidate', candidate: candidate.toJSON() },
        });
      };
      peer.ontrack = ({ streams }) => {
        if (!audioElementRef.current) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          audio.playsInline = true;
          audio.style.display = 'none';
          document.body.appendChild(audio);
          audioElementRef.current = audio;
        }
        audioElementRef.current.srcObject = streams[0];
        audioElementRef.current.play().catch(() => {});
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setState('active');
        if (['failed', 'disconnected'].includes(peer.connectionState)) setState('failed');
      };

      setState('waiting');
      socket.emit('call:ready', { callId: match.callId }, (result) => {
        if (!result?.ok) {
          setError(result?.error || 'Call is no longer available.');
          setState('failed');
          cleanupMedia();
        }
      });
    } catch (mediaError) {
      setError(mediaError.message || (isDe ? 'Das Mikrofon konnte nicht geöffnet werden.' : 'Could not open the microphone.'));
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
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
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
    matched: isDe ? 'Match gefunden. Bestätige, wenn du bereit bist.' : 'Match found. Confirm when you are ready.',
    preparing: isDe ? 'Mikrofon wird vorbereitet…' : 'Preparing microphone…',
    waiting: isDe ? 'Warte darauf, dass dein Partner startet…' : 'Waiting for your partner to start…',
    connecting: isDe ? 'Audioverbindung wird aufgebaut…' : 'Connecting audio…',
    active: isDe ? 'Audioanruf verbunden' : 'Audio call connected',
    failed: isDe ? 'Der Audioanruf konnte nicht verbunden werden.' : 'The audio call could not connect.',
    ended: remoteEnd
      ? remoteEnd.reason === 'user-ended'
        ? (isDe ? `Getrennt: ${remoteEnd.endedBy || 'Nutzer'} hat den Anruf beendet.` : `Disconnected: ${remoteEnd.endedBy || 'User'} ended the call.`)
        : (isDe ? 'Getrennt: Dein Partner hat die Verbindung verloren.' : 'Disconnected: Your partner lost the connection.')
      : (isDe ? 'Anruf beendet' : 'Call ended'),
  }[state];

  return (
    <View style={styles.card}>
      <View style={styles.partnerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{match.partner.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.partnerCopy}>
          <Text style={styles.foundLabel}>{isDe ? 'Partner gefunden' : 'Partner found'}</Text>
          <Text style={styles.partnerName}>{match.partner.name}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {state === 'matched' || state === 'failed' ? (
        <Pressable style={styles.startButton} onPress={prepareCall}>
          <Ionicons name="call" size={19} color="#155a6a" />
          <Text style={styles.startButtonText}>{isDe ? 'Ich bin bereit' : "I'm ready"}</Text>
        </Pressable>
      ) : null}

      {['preparing', 'waiting', 'connecting'].includes(state) ? (
        <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color="#155a6a" />
          <Text style={styles.waitingText}>{statusText}</Text>
        </View>
      ) : null}

      {state === 'active' ? (
        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={toggleMute}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={21} color={colors.textDark} />
            <Text style={styles.controlText}>{muted ? (isDe ? 'Stumm' : 'Muted') : (isDe ? 'Mikrofon' : 'Microphone')}</Text>
          </Pressable>
          <Pressable style={styles.endButton} onPress={() => setConfirmEnd(true)}>
            <Ionicons name="call" size={21} color="#fff" />
            <Text style={styles.endText}>{isDe ? 'Beenden' : 'End'}</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'ended' ? (
        <>
          <Text style={styles.countdownText}>
            {isDe
              ? `Automatische Rückkehr in ${returnCountdown} Sekunden.`
              : `Returning automatically in ${returnCountdown} seconds.`}
          </Text>
          <Pressable style={styles.doneButton} onPress={() => onFinished({ makeAvailable: true })}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.doneButtonProgress,
                {
                  width: returnProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.doneText}>
              {isDe ? 'Zurück zum Netzwerk' : 'Back to network'}
            </Text>
          </Pressable>
        </>
      ) : null}

      <Modal visible={confirmEnd} transparent animationType="fade" onRequestClose={() => setConfirmEnd(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="call" size={24} color="#d9485f" />
            </View>
            <Text style={styles.confirmTitle}>{isDe ? 'Anruf beenden?' : 'End this call?'}</Text>
            <Text style={styles.confirmMessage}>
              {isDe
                ? `${match.partner.name} wird darüber informiert, dass du den Anruf beendet hast.`
                : `${match.partner.name} will be told that you ended the call.`}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.keepButton} onPress={() => setConfirmEnd(false)}>
                <Text style={styles.keepText}>{isDe ? 'Weiterreden' : 'Keep talking'}</Text>
              </Pressable>
              <Pressable style={styles.confirmEndButton} onPress={end}>
                <Text style={styles.confirmEndText}>{isDe ? 'Anruf beenden' : 'End call'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.cardBg },
  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa' },
  avatarText: { color: '#155a6a', fontSize: 20, fontWeight: '900' },
  partnerCopy: { flex: 1, marginLeft: 12 },
  foundLabel: { color: '#2f9e44', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  partnerName: { marginTop: 2, color: colors.textDark, fontSize: 17, fontWeight: '900' },
  status: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  error: { marginTop: 12, color: '#c92a2a', fontSize: 12, lineHeight: 17 },
  startButton: { marginTop: 14, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: '#bfeefa' },
  startButtonText: { color: '#155a6a', fontSize: 14, fontWeight: '900' },
  waitingRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  waitingText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  controls: { marginTop: 14, flexDirection: 'row', gap: 10 },
  controlButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  controlText: { color: colors.textDark, fontSize: 12, fontWeight: '800' },
  endButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: '#d9485f' },
  endText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  doneButton: { position: 'relative', marginTop: 10, minHeight: 46, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.cardBg },
  doneButtonProgress: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#bfeefa' },
  doneText: { zIndex: 1, color: '#fff', fontSize: 12, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 },
  countdownText: { marginTop: 12, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(4, 12, 18, 0.78)' },
  confirmCard: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 22, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
  confirmIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe3e3' },
  confirmTitle: { marginTop: 12, color: colors.textDark, fontSize: 19, fontWeight: '900' },
  confirmMessage: { marginTop: 7, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  confirmActions: { width: '100%', marginTop: 18, flexDirection: 'row', gap: 10 },
  keepButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border },
  keepText: { color: colors.textDark, fontSize: 12, fontWeight: '800' },
  confirmEndButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#d9485f' },
  confirmEndText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
