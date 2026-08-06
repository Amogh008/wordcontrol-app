import { localize, localizeFormat } from "../locales";import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import NestedConfirmDialog from './NestedConfirmDialog';
import { createCallE2EEContext, isCallE2EESupported } from '../services/callE2EE';

export default function WebAudioCall({ socket, match, selectedDeviceId, onFinished }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const audioElementRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const e2eeRef = useRef(null);
  const readySentRef = useRef(false);
  const e2eeTimerRef = useRef(null);
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
    if (e2eeTimerRef.current) clearTimeout(e2eeTimerRef.current);
    e2eeTimerRef.current = null;
    e2eeRef.current?.destroy();
    e2eeRef.current = null;
    readySentRef.current = false;
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
      signal: { type: 'description', description: peer.localDescription.toJSON() }
    });
  }, [match.callId, socket]);

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

  const secureCallWithPartnerKey = useCallback(async (publicKey) => {
    const context = e2eeRef.current;
    const peer = peerRef.current;
    if (!context || !peer) return;
    await context.acceptRemotePublicKey(publicKey);
    peer.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'audio') context.protectSender(sender);
    });
    peer.getReceivers().forEach((receiver) => {
      if (receiver.track?.kind === 'audio') context.protectReceiver(receiver);
    });
    markEncryptedCallReady();
  }, [markEncryptedCallReady]);

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
      if (callId !== match.callId || !signal) return;
      try {
        if (signal.type === 'e2ee-key-request') {
          if (!e2eeRef.current) return;
          await secureCallWithPartnerKey(signal.publicKey);
          socket.emit('call:signal', {
            callId: match.callId,
            signal: { type: 'e2ee-key-response', publicKey: e2eeRef.current.localPublicKey }
          });
          return;
        }
        if (signal.type === 'e2ee-key-response') {
          await secureCallWithPartnerKey(signal.publicKey);
          return;
        }

        const peer = peerRef.current;
        if (!peer) return;
        if (signal.type === 'description') {
          await peer.setRemoteDescription(signal.description);
          peer.getReceivers().forEach((receiver) => {
            if (receiver.track?.kind === 'audio') e2eeRef.current?.protectReceiver(receiver);
          });
          await flushCandidates();
          if (signal.description.type === 'offer') {
            await sendDescription(await peer.createAnswer());
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(signal.candidate);
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
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
  }, [cleanupMedia, flushCandidates, isDe, match.callId, secureCallWithPartnerKey, sendDescription, socket]);

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
      useNativeDriver: false
    });
    animation.start();
    return () => animation.stop();
  }, [returnProgress, state]);

  const prepareCall = async () => {
    if (Platform.OS !== 'web') {
      setError(localize('Native audio calls require the next Expo build step.'));
      return;
    }
    if (!globalThis.isSecureContext) {
      setError(localize(


        'Microphone access requires HTTPS or localhost.')
      );
      return;
    }
    if (!isCallE2EESupported()) {
      setError(localize('This browser cannot start audio calls.'));
      setState('failed');
      return;
    }

    try {
      setState('preparing');
      setError('');
      const audio = selectedDeviceId ?
      { deviceId: { exact: selectedDeviceId } } :
      true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      streamRef.current = stream;

      const e2ee = await createCallE2EEContext({
        callId: match.callId,
        onError: () => {
          setError(localize('The audio connection failed.'));
          setState('failed');
          cleanupMedia();
        },
      });
      e2eeRef.current = e2ee;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        socket.emit('call:signal', {
          callId: match.callId,
          signal: { type: 'candidate', candidate: candidate.toJSON() }
        });
      };
      peer.ontrack = ({ receiver, streams }) => {
        try {
          if (receiver.track?.kind === 'audio') e2eeRef.current?.protectReceiver(receiver);
        } catch (encryptionError) {
          setError(encryptionError.message);
          setState('failed');
          return;
        }
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

      setState('securing');
      socket.emit('call:signal', {
        callId: match.callId,
        signal: { type: 'e2ee-key-request', publicKey: e2ee.localPublicKey }
      });
      e2eeTimerRef.current = setTimeout(() => {
        setError(localize('Could not establish the audio connection.'));
        setState('failed');
        cleanupMedia();
      }, 15000);
    } catch (mediaError) {
      setError(mediaError.message || localize('Could not open the microphone.'));
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{match.partner.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.partnerCopy}>
          <Text style={styles.foundLabel}>{localize('Partner found')}</Text>
          <Text style={styles.partnerName}>{match.partner.name}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      </View>

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
    </View>);

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
  confirmEndText: { color: '#fff', fontSize: 12, fontWeight: '900' }
});
