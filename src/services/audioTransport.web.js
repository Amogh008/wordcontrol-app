export const AUDIO_SAMPLE_RATE = 16000;
const CAPTURE_BUFFER_SIZE = 1024;
const PLAYBACK_LEAD_SECONDS = 0.08;

function floatTo16BitPCM(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i]));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out;
}

function int16ToFloat32(int16) {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) {
    const sample = int16[i];
    out[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
  }
  return out;
}

function resampleFloat32(input, inputRate, outputRate) {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const sourceIndex = i * ratio;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, input.length - 1);
    const fraction = sourceIndex - lowerIndex;
    output[i] = input[lowerIndex] * (1 - fraction) + input[upperIndex] * fraction;
  }
  return output;
}

export async function createAudioCallTransport({ iceServers, onIceCandidate, onDataChannelOpen, onDataChannelMessage, onConnectionStateChange }) {
  const peer = new RTCPeerConnection({ iceServers });
  let dataChannel = null;

  let micStream = null;
  let captureContext = null;
  let captureSource = null;
  let captureProcessor = null;

  let playbackContext = null;
  let nextPlaybackTime = 0;

  const setupDataChannel = (channel) => {
    dataChannel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => onDataChannelOpen();
    channel.onmessage = (event) => onDataChannelMessage(new Uint8Array(event.data));
  };

  peer.onicecandidate = ({ candidate }) => {
    if (candidate) onIceCandidate(candidate.toJSON());
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
      return peer.localDescription.toJSON();
    },
    async createAnswer() {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return peer.localDescription.toJSON();
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
    async startCapture(deviceId, onChunk) {
      const audio = deviceId ? { deviceId: { exact: deviceId } } : true;
      micStream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      captureContext = new (window.AudioContext || window.webkitAudioContext)();
      captureSource = captureContext.createMediaStreamSource(micStream);
      captureProcessor = captureContext.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);
      captureProcessor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const resampled = resampleFloat32(input, captureContext.sampleRate, AUDIO_SAMPLE_RATE);
        const pcm16 = floatTo16BitPCM(resampled);
        onChunk(new Uint8Array(pcm16.buffer));
      };
      captureSource.connect(captureProcessor);
      captureProcessor.connect(captureContext.destination);
    },
    stopCapture() {
      captureProcessor?.disconnect();
      captureSource?.disconnect();
      captureContext?.close().catch(() => {});
      micStream?.getTracks().forEach((track) => track.stop());
      captureProcessor = null;
      captureSource = null;
      captureContext = null;
      micStream = null;
    },
    async startPlayback() {
      playbackContext = new (window.AudioContext || window.webkitAudioContext)();
      nextPlaybackTime = playbackContext.currentTime + PLAYBACK_LEAD_SECONDS;
    },
    playChunk(bytes) {
      if (!playbackContext) return;
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const resampled = resampleFloat32(int16ToFloat32(int16), AUDIO_SAMPLE_RATE, playbackContext.sampleRate);
      const buffer = playbackContext.createBuffer(1, resampled.length, playbackContext.sampleRate);
      buffer.copyToChannel(resampled, 0);
      const source = playbackContext.createBufferSource();
      source.buffer = buffer;
      source.connect(playbackContext.destination);
      const startAt = Math.max(playbackContext.currentTime + 0.01, nextPlaybackTime);
      source.start(startAt);
      nextPlaybackTime = startAt + buffer.duration;
    },
    stopPlayback() {
      playbackContext?.close().catch(() => {});
      playbackContext = null;
    },
    close() {
      dataChannel?.close();
      peer.close();
    },
  };
}
