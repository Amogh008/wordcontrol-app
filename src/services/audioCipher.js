import { ecdh } from '@noble/curves/abstract/weierstrass.js';
import { p256 } from '@noble/curves/nist.js';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

const dh = ecdh(p256.Point);

const PACKET_VERSION = 1;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

function base64ToBytes(value) {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function compareBytes(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

/**
 * Encrypted-PCM-chunk call cipher. Same ECDH/HKDF key-exchange scheme as the
 * previous RTP-frame-based E2EE, but operates on whole raw-audio chunks so it
 * works identically on web and native (no insertable-streams dependency).
 */
export function createAudioCallCipher({ callId }) {
  const keypair = dh.keygen();
  const localPublicKeyBytes = keypair.publicKey;
  const localPublicKey = bytesToBase64(localPublicKeyBytes);

  let remotePublicKey = null;
  let outgoingKey = null;
  let incomingKey = null;
  let keysReady = false;

  const acceptRemotePublicKey = (encodedPublicKey) => {
    if (remotePublicKey && remotePublicKey !== encodedPublicKey) {
      throw new Error('The partner encryption key changed during this call.');
    }
    if (keysReady) return;

    const remotePublicKeyBytes = base64ToBytes(encodedPublicKey);
    if (remotePublicKeyBytes.length !== 33 || compareBytes(localPublicKeyBytes, remotePublicKeyBytes) === 0) {
      throw new Error('The partner supplied an invalid encryption key.');
    }
    remotePublicKey = encodedPublicKey;

    const sharedSecret = dh.getSharedSecret(keypair.secretKey, remotePublicKeyBytes);
    const salt = sha256(new TextEncoder().encode(callId));
    const material = hkdf(sha256, sharedSecret, salt, new TextEncoder().encode('wordcontrol-audio-e2ee-v1'), KEY_LENGTH * 2);

    const firstKey = material.slice(0, KEY_LENGTH);
    const secondKey = material.slice(KEY_LENGTH, KEY_LENGTH * 2);
    const localKeySortsFirst = compareBytes(localPublicKeyBytes, remotePublicKeyBytes) < 0;
    outgoingKey = localKeySortsFirst ? firstKey : secondKey;
    incomingKey = localKeySortsFirst ? secondKey : firstKey;
    keysReady = true;
  };

  const aad = new TextEncoder().encode(`${callId}:audio:v1`);

  const encryptChunk = (pcmBytes) => {
    if (!outgoingKey) throw new Error('The outgoing encryption key is not ready.');
    const iv = randomBytes(IV_LENGTH);
    const ciphertext = gcm(outgoingKey, iv, aad).encrypt(pcmBytes);
    const packet = new Uint8Array(1 + IV_LENGTH + ciphertext.length);
    packet[0] = PACKET_VERSION;
    packet.set(iv, 1);
    packet.set(ciphertext, 1 + IV_LENGTH);
    return packet;
  };

  const decryptChunk = (packet) => {
    if (!incomingKey) throw new Error('The incoming encryption key is not ready.');
    if (packet.length <= 1 + IV_LENGTH || packet[0] !== PACKET_VERSION) {
      throw new Error('Received an invalid encrypted audio chunk.');
    }
    const iv = packet.slice(1, 1 + IV_LENGTH);
    const ciphertext = packet.slice(1 + IV_LENGTH);
    return gcm(incomingKey, iv, aad).decrypt(ciphertext);
  };

  return {
    localPublicKey,
    acceptRemotePublicKey,
    get keysReady() {
      return keysReady;
    },
    encryptChunk,
    decryptChunk,
    destroy: () => {},
  };
}
