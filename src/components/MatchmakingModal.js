import { localize, localizeFormat } from "../locales";import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View } from
'react-native';
import { Picker } from '@react-native-picker/picker';
import { HazyPicker } from './HazySelect';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import WebAudioCall from './WebAudioCall';

function createRadarBlips() {
  const count = 4 + Math.floor(Math.random() * 4);
  return Array.from({ length: count }, (_, index) => {
    const size = 6 + Math.floor(Math.random() * 9);
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.sqrt(Math.random()) * 70;
    return {
      id: `${Date.now()}-${index}-${Math.random()}`,
      size,
      left: 115 + Math.cos(angle) * radius - size / 2,
      top: 115 + Math.sin(angle) * radius - size / 2
    };
  });
}

export default function MatchmakingModal({
  visible,
  socket,
  matching,
  match,
  timedOut,
  onStartSearch,
  onRetry,
  onCancel,
  onFinished
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const radar = useRef(new Animated.Value(0)).current;
  const radarSweep = useRef(new Animated.Value(0)).current;
  const blipOpacity = useRef(new Animated.Value(1)).current;
  const searchProgress = useRef(new Animated.Value(1)).current;
  const timeoutProgress = useRef(new Animated.Value(1)).current;
  const testStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const meterTimerRef = useRef(null);
  const [searchStarted, setSearchStarted] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [testing, setTesting] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const [timeoutCountdown, setTimeoutCountdown] = useState(10);
  const [searchSeconds, setSearchSeconds] = useState(60);
  const [radarBlips, setRadarBlips] = useState(createRadarBlips);

  const stopTest = () => {
    if (meterTimerRef.current) clearInterval(meterTimerRef.current);
    meterTimerRef.current = null;
    testStreamRef.current?.getTracks().forEach((track) => track.stop());
    testStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setTesting(false);
    setLevel(0);
  };

  useEffect(() => () => stopTest(), []);

  useEffect(() => {
    if (!visible) {
      stopTest();
      setSearchStarted(false);
      setError('');
    }
  }, [visible]);

  useEffect(() => {
    if (!searchStarted || match || timedOut) {
      radar.stopAnimation();
      radarSweep.stopAnimation();
      radar.setValue(0);
      radarSweep.setValue(0);
      return undefined;
    }
    radar.setValue(0);
    const pulseAnimation = Animated.loop(
      Animated.sequence([
      Animated.timing(radar, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(radar, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      })]
      ),
      { iterations: -1, resetBeforeIteration: true }
    );
    radarSweep.setValue(0);
    const sweepAnimation = Animated.loop(
      Animated.sequence([
      Animated.timing(radarSweep, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true
      }),
      Animated.timing(radarSweep, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      })]
      ),
      { iterations: -1, resetBeforeIteration: true }
    );
    pulseAnimation.start();
    sweepAnimation.start();
    return () => {
      pulseAnimation.stop();
      sweepAnimation.stop();
    };
  }, [match, radar, radarSweep, searchStarted, timedOut]);

  useEffect(() => {
    if (!searchStarted || match || timedOut) return undefined;
    let active = true;
    const replaceBlips = () => {
      Animated.timing(blipOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (!finished || !active) return;
        setRadarBlips(createRadarBlips());
        Animated.timing(blipOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }).start();
      });
    };
    const timer = setInterval(replaceBlips, 1600);
    return () => {
      active = false;
      clearInterval(timer);
      blipOpacity.stopAnimation();
      blipOpacity.setValue(1);
    };
  }, [blipOpacity, match, searchStarted, timedOut]);

  useEffect(() => {
    if (!searchStarted || match || timedOut) return undefined;
    setSearchSeconds(60);
    searchProgress.setValue(1);
    const animation = Animated.timing(searchProgress, {
      toValue: 0,
      duration: 60000,
      easing: Easing.linear,
      useNativeDriver: false
    });
    animation.start();
    const timer = setInterval(() => {
      setSearchSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      animation.stop();
      clearInterval(timer);
    };
  }, [match, searchProgress, searchStarted, timedOut]);

  useEffect(() => {
    if (!timedOut) return undefined;
    setTimeoutCountdown(10);
    timeoutProgress.setValue(1);
    const animation = Animated.timing(timeoutProgress, {
      toValue: 0,
      duration: 10000,
      useNativeDriver: false
    });
    animation.start();
    const countdownTimer = setInterval(() => {
      setTimeoutCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    const returnTimer = setTimeout(() => onCancel(), 10000);
    return () => {
      animation.stop();
      clearInterval(countdownTimer);
      clearTimeout(returnTimer);
    };
    // onCancel is intentionally captured for this single timeout lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut, timeoutProgress]);

  const testMicrophone = async () => {
    if (testing) {
      stopTest();
      return;
    }
    if (Platform.OS !== 'web' || !globalThis.isSecureContext) {
      setError(localize('The microphone test requires HTTPS or localhost.'));
      return;
    }
    try {
      setError('');
      const audio = selectedDeviceId ?
      { deviceId: { exact: selectedDeviceId } } :
      true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      testStreamRef.current = stream;
      const inputs = (await navigator.mediaDevices.enumerateDevices()).
      filter((device) => device.kind === 'audioinput');
      setDevices(inputs);
      const activeDeviceId = stream.getAudioTracks()[0]?.getSettings?.().deviceId || selectedDeviceId;
      if (activeDeviceId) setSelectedDeviceId(activeDeviceId);

      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = audioContext;
      meterTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
        setLevel(Math.min(100, Math.round(average * 1.8)));
      }, 100);
      setTesting(true);
      setMicReady(true);
    } catch (microphoneError) {
      setError(microphoneError.message || localize('Could not test the microphone.'));
      stopTest();
    }
  };

  const beginSearch = () => {
    stopTest();
    setSearchStarted(true);
    setError('');
    onStartSearch();
  };

  const retrySearch = () => {
    setSearchStarted(true);
    setError('');
    onRetry();
  };

  const close = () => {
    stopTest();
    setSearchStarted(false);
    onCancel();
  };

  const ringScale = radar.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.4] });
  const ringOpacity = radar.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.65, 0.16, 0] });
  const sweepRotation = radarSweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={match ? () => {} : close}>

      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{localize('SPEAKING NETWORK')}</Text>
              <Text style={styles.title}>
                {match ? localize(
                  'Connection found') :
                timedOut ? localize(
                  'Search finished') :
                searchStarted ? localize(
                  'Finding a partner') : localize(
                  'Prepare your audio')}
              </Text>
            </View>
            {!match ?
            <Pressable onPress={close} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.textDark} />
              </Pressable> :
            null}
          </View>

          {match && socket ?
          <WebAudioCall
            key={match.callId}
            socket={socket}
            match={match}
            selectedDeviceId={selectedDeviceId}
            onFinished={onFinished} /> :

          timedOut ?
          <View style={styles.noMatchBody}>
              <View style={styles.noMatchIcon}>
                <Ionicons name="search-outline" size={34} color="#8a5a00" />
              </View>
              <Text style={styles.noMatchTitle}>{localize('No match found')}</Text>
              <Text style={styles.noMatchText}>
                {localize(

                'No available learning partner was found within one minute.')}
              </Text>
              <Pressable style={styles.retryButton} onPress={retrySearch}>
                <Ionicons name="refresh" size={19} color="#155a6a" />
                <Text style={styles.retryText}>{localize('Retry')}</Text>
              </Pressable>
              <Text style={styles.timeoutText}>
                {localizeFormat("Returning automatically in {0} seconds.", [

              timeoutCountdown])}
              </Text>
              <Pressable style={styles.timeoutBackButton} onPress={close}>
                <Animated.View
                pointerEvents="none"
                style={[
                styles.timeoutBackProgress,
                {
                  width: timeoutProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }]
                } />

                <Text style={styles.timeoutBackText}>{localize('Back to network')}</Text>
              </Pressable>
            </View> :
          searchStarted ?
          <View style={styles.searchBody}>
              <View style={styles.radarWrap}>
                <Animated.View style={[styles.radarRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                <View style={styles.radarMiddleRing} />
                <View style={styles.radarInnerRing} />
                <View style={styles.radarHorizontalLine} />
                <View style={styles.radarVerticalLine} />
                <Animated.View style={[styles.radarSweep, { transform: [{ rotate: sweepRotation }] }]}>
                  <View style={styles.radarSweepArm} />
                  <View style={styles.radarSweepGlow} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.radarBlips, { opacity: blipOpacity }]}>
                  {radarBlips.map((blip) =>
                <View
                  key={blip.id}
                  style={[
                  styles.radarBlip,
                  {
                    width: blip.size,
                    height: blip.size,
                    borderRadius: blip.size / 2,
                    left: blip.left,
                    top: blip.top
                  }]
                  } />

                )}
                </Animated.View>
                <View style={styles.radarCenter}>
                  <Ionicons name="person" size={30} color="#155a6a" />
                </View>
              </View>
              <Text style={styles.searchTitle}>
                {matching ? localize('Searching worldwide…') : localize('Preparing connection…')}
              </Text>
              <Text style={styles.searchHint}>
                {localize('We are looking for an available German learning partner.')}
              </Text>
              <View style={styles.searchTimerRow}>
                <Text style={styles.searchTimerLabel}>{localize('Search time remaining')}</Text>
                <Text style={styles.searchTimerValue}>{searchSeconds}{localize("s")}</Text>
              </View>
              <View style={styles.searchProgressTrack} accessibilityRole="progressbar">
                <Animated.View
                style={[
                styles.searchProgressFill,
                {
                  width: searchProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: searchProgress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['#e03131', '#f2c94c', '#2f9e44']
                  })
                }]
                } />

              </View>
              <Pressable style={styles.cancelButton} onPress={close}>
                <Text style={styles.cancelText}>{localize('Cancel search')}</Text>
              </Pressable>
            </View> :

          <View style={styles.setupBody}>
              <View style={styles.settingCard}>
                <View style={styles.settingHeading}>
                  <Ionicons name="mic" size={21} color="#155a6a" />
                  <View style={styles.settingCopy}>
                    <Text style={styles.settingTitle}>{localize('Microphone')}</Text>
                    <Text style={styles.settingSubtitle}>{localize('Choose and test your voice before searching.')}</Text>
                  </View>
                </View>

                {devices.length > 0 ?
              <HazyPicker containerStyle={styles.pickerWrap}
                  selectedValue={selectedDeviceId}
                  onValueChange={setSelectedDeviceId}
                  pickerStyle={styles.picker}>

                      {devices.map((device, index) =>
                  <Picker.Item
                    key={device.deviceId}
                    label={device.label || `${localize('Microphone')} ${index + 1}`}
                    value={device.deviceId} />

                  )}
                  </HazyPicker> :
              null}

                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${Math.max(level, micReady ? 4 : 0)}%` }]} />
                </View>
                <View style={styles.meterLabels}>
                  <Text style={styles.meterText}>{localize('Quiet')}</Text>
                  <Text style={styles.meterText}>{localize('Loud')}</Text>
                </View>

                <Pressable style={styles.testButton} onPress={testMicrophone}>
                  <Ionicons name={testing ? 'stop-circle' : 'mic-circle'} size={20} color="#155a6a" />
                  <Text style={styles.testText}>
                    {testing ? localize('Stop test') : localize('Test microphone')}
                  </Text>
                </Pressable>
              </View>

              {micReady ?
            <View style={styles.readyRow}>
                  <Ionicons name="checkmark-circle" size={19} color="#2f9e44" />
                  <Text style={styles.readyText}>{localize('Microphone is ready')}</Text>
                </View> :
            null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.searchButton} onPress={beginSearch}>
                <Ionicons name="radio" size={20} color="#155a6a" />
                <Text style={styles.searchButtonText}>{localize('Start random search')}</Text>
              </Pressable>
            </View>
          }
        </View>
      </View>
    </Modal>);

}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(4, 12, 18, 0.78)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '92%', alignSelf: 'center', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.pageBg, shadowColor: '#62d6ee', shadowOpacity: 0.28, shadowRadius: 24, elevation: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: { color: '#2b8aa0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 3, color: colors.textDark, fontSize: 21, fontWeight: '900' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBg },
  setupBody: { gap: 12 },
  settingCard: { padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
  settingHeading: { flexDirection: 'row', alignItems: 'center' },
  settingCopy: { flex: 1, marginLeft: 10 },
  settingTitle: { color: colors.textDark, fontSize: 15, fontWeight: '900' },
  settingSubtitle: { marginTop: 2, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  pickerWrap: { marginTop: 14 },
  picker: { color: colors.textDark },
  meterTrack: { marginTop: 16, height: 9, overflow: 'hidden', borderRadius: 5, backgroundColor: colors.border },
  meterFill: { height: '100%', borderRadius: 5, backgroundColor: '#62d6ee' },
  meterLabels: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  meterText: { color: colors.textMuted, fontSize: 9 },
  testButton: { marginTop: 12, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, backgroundColor: '#d9f7fc' },
  testText: { color: '#155a6a', fontSize: 12, fontWeight: '900' },
  readyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  readyText: { color: '#2f9e44', fontSize: 12, fontWeight: '800' },
  error: { color: '#c92a2a', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  searchButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  searchButtonText: { color: '#155a6a', fontSize: 14, fontWeight: '900' },
  searchBody: { alignItems: 'center', paddingVertical: 12 },
  radarWrap: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: '#62d6ee' },
  radarMiddleRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: 'rgba(98,214,238,0.34)' },
  radarInnerRing: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(98,214,238,0.28)' },
  radarHorizontalLine: { position: 'absolute', width: 210, height: 1, backgroundColor: 'rgba(98,214,238,0.25)' },
  radarVerticalLine: { position: 'absolute', width: 1, height: 210, backgroundColor: 'rgba(98,214,238,0.25)' },
  radarSweep: { position: 'absolute', width: 210, height: 210, borderRadius: 105 },
  radarSweepArm: { position: 'absolute', top: 1, left: 104, width: 2, height: 104, borderRadius: 1, backgroundColor: '#62d6ee', shadowColor: '#62d6ee', shadowOpacity: 0.9, shadowRadius: 5 },
  radarSweepGlow: { position: 'absolute', top: 8, left: 99, width: 12, height: 96, borderRadius: 8, backgroundColor: 'rgba(98,214,238,0.12)' },
  radarBlips: { position: 'absolute', top: 0, left: 0, width: 230, height: 230 },
  radarBlip: { position: 'absolute', backgroundColor: '#78ecff', borderWidth: 1, borderColor: '#d9faff', shadowColor: '#62d6ee', shadowOpacity: 0.9, shadowRadius: 7, elevation: 4 },
  radarCenter: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa', borderWidth: 3, borderColor: '#62d6ee' },
  searchTitle: { color: colors.textDark, fontSize: 18, fontWeight: '900' },
  searchHint: { marginTop: 6, maxWidth: 330, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  searchTimerRow: { width: '100%', marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchTimerLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  searchTimerValue: { color: '#2b8aa0', fontSize: 11, fontWeight: '900' },
  searchProgressTrack: { width: '100%', height: 8, marginTop: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: colors.border },
  searchProgressFill: { height: '100%', borderRadius: 4 },
  cancelButton: { marginTop: 20, minHeight: 42, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textDark, fontSize: 12, fontWeight: '800' },
  noMatchBody: { alignItems: 'center', paddingVertical: 14 },
  noMatchIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff3bf' },
  noMatchTitle: { marginTop: 14, color: colors.textDark, fontSize: 20, fontWeight: '900' },
  noMatchText: { marginTop: 6, maxWidth: 340, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retryButton: { width: '100%', minHeight: 48, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: '#bfeefa', borderWidth: 1, borderColor: '#62d6ee' },
  retryText: { color: '#155a6a', fontSize: 13, fontWeight: '900' },
  timeoutText: { marginTop: 15, color: colors.textMuted, fontSize: 11 },
  timeoutBackButton: { position: 'relative', width: '100%', minHeight: 46, marginTop: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#62d6ee', backgroundColor: colors.cardBg },
  timeoutBackProgress: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#bfeefa' },
  timeoutBackText: { zIndex: 1, color: '#fff', fontSize: 12, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }
});
