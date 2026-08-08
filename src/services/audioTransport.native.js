import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { RTCPeerConnection } from 'react-native-webrtc';
import AudioRecord from 'react-native-live-audio-stream';
import { toByteArray, fromByteArray } from 'base64-js';

async function ensureMicrophonePermission() {
  if (Platform.OS !== 'android') return;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (already) return;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Microphone permission was denied.');
  }
}

export const AUDIO_SAMPLE_RATE = 16000;
const CAPTURE_CHUNK_BYTES = 1600; // ~50ms of 16-bit mono PCM @ 16kHz
const VOICE_COMMUNICATION_AUDIO_SOURCE = 7;

const { PcmAudioPlayer } = NativeModules;

export async function createAudioCallTransport({ iceServers, onIceCandidate, onDataChannelOpen, onDataChannelMessage, onConnectionStateChange }) {
  const peer = new RTCPeerConnection({ iceServers });
  let dataChannel = null;
  let captureSubscription = null;
  let capturing = false;
  let playing = false;

  const setupDataChannel = (channel) => {
    dataChannel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => onDataChannelOpen();
    channel.onmessage = (event) => onDataChannelMessage(new Uint8Array(event.data));
  };

  peer.onicecandidate = ({ candidate }) => {
    if (candidate) onIceCandidate(candidate.toJSON ? candidate.toJSON() : candidate);
  };
  peer.onconnectionstatechange = () => onConnectionStateChange(peer.connectionState);
  peer.ondatachannel = (event) => setupDataChannel(event.channel);

  return {
    isInitiator(initiator) {
      if (initiator) {
        setupDataChannel(peer.createDataChannel('audio', { ordered: false, maxRetransmits: 0 }));
      }
    },
    async createOffer() {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      return { type: peer.localDescription.type, sdp: peer.localDescription.sdp };
    },
    async createAnswer() {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return { type: peer.localDescription.type, sdp: peer.localDescription.sdp };
    },
    async setRemoteDescription(description) {
      await peer.setRemoteDescription(description);
    },
    async addIceCandidate(candidate) {
      await peer.addIceCandidate(candidate);
    },
    send(bytes) {
      if (dataChannel?.readyState === 'open') dataChannel.send(bytes);
    },
    async startCapture(_deviceId, onChunk) {
      await ensureMicrophonePermission();
      capturing = true;
      AudioRecord.init({
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: 1,
        bitsPerSample: 16,
        audioSource: VOICE_COMMUNICATION_AUDIO_SOURCE,
        bufferSize: CAPTURE_CHUNK_BYTES,
      });
      captureSubscription = AudioRecord.on('data', (base64Chunk) => {
        if (!capturing) return;
        onChunk(toByteArray(base64Chunk));
      });
      AudioRecord.start();
    },
    stopCapture() {
      capturing = false;
      AudioRecord.stop();
      captureSubscription?.remove?.();
      captureSubscription = null;
    },
    async startPlayback() {
      playing = true;
      await PcmAudioPlayer.init(AUDIO_SAMPLE_RATE);
    },
    playChunk(bytes) {
      if (!playing) return;
      PcmAudioPlayer.write(fromByteArray(bytes));
    },
    stopPlayback() {
      playing = false;
      PcmAudioPlayer.stop().catch(() => {});
    },
    close() {
      dataChannel?.close();
      peer.close();
    },
  };
}
