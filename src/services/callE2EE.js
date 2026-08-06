const E2EE_VERSION = 1;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

const workerSource = `
const VERSION = ${E2EE_VERSION};
const IV_LENGTH = ${IV_LENGTH};
const encoder = new TextEncoder();

self.onrtctransform = ({ transformer }) => {
  const { operation, key, aad } = transformer.options;
  const keyPromise = crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    { name: 'AES-GCM' },
    false,
    [operation === 'encrypt' ? 'encrypt' : 'decrypt']
  );
  const additionalData = encoder.encode(aad);
  let reportedFailure = false;

  const reportFailure = (error) => {
    if (reportedFailure) return;
    reportedFailure = true;
    self.postMessage({ type: 'e2ee-error', message: error?.message || 'Encrypted audio frame failed.' });
  };

  const transform = new TransformStream({
    async transform(frame, controller) {
      try {
        const cryptoKey = await keyPromise;
        if (operation === 'encrypt') {
          const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
          const plaintext = new Uint8Array(frame.data);
          const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
            cryptoKey,
            plaintext
          ));
          const packet = new Uint8Array(1 + IV_LENGTH + ciphertext.length);
          packet[0] = VERSION;
          packet.set(iv, 1);
          packet.set(ciphertext, 1 + IV_LENGTH);
          frame.data = packet.buffer;
          controller.enqueue(frame);
          return;
        }

        const packet = new Uint8Array(frame.data);
        if (packet.length <= 1 + IV_LENGTH || packet[0] !== VERSION) {
          throw new Error('Received an invalid encrypted audio frame.');
        }
        const iv = packet.slice(1, 1 + IV_LENGTH);
        const ciphertext = packet.slice(1 + IV_LENGTH);
        frame.data = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
          cryptoKey,
          ciphertext
        );
        controller.enqueue(frame);
      } catch (error) {
        reportFailure(error);
      }
    }
  });

  transformer.readable
    .pipeThrough(transform)
    .pipeTo(transformer.writable)
    .catch(reportFailure);
};
`;

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

function createTransformWorker(onError) {
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);
  worker.onmessage = ({ data }) => {
    if (data?.type === 'e2ee-error') onError?.(data.message);
  };
  worker.onerror = (event) => onError?.(event.message || 'Encrypted audio worker failed.');
  return worker;
}

export function isCallE2EESupported() {
  return Boolean(
    globalThis.isSecureContext &&
    globalThis.crypto?.subtle &&
    globalThis.Worker &&
    globalThis.RTCRtpScriptTransform
  );
}

export async function createCallE2EEContext({ callId, onError }) {
  if (!isCallE2EESupported()) {
    throw new Error('This browser does not support end-to-end encrypted audio calls.');
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const localPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const localPublicKey = bytesToBase64(localPublicKeyBytes);
  const worker = createTransformWorker(onError);
  const protectedSenders = new WeakSet();
  const protectedReceivers = new WeakSet();
  let remotePublicKey = null;
  let outgoingKey = null;
  let incomingKey = null;
  let keysReady = false;

  const acceptRemotePublicKey = async (encodedPublicKey) => {
    if (remotePublicKey && remotePublicKey !== encodedPublicKey) {
      throw new Error('The partner encryption key changed during this call.');
    }
    if (keysReady) return;

    const remotePublicKeyBytes = base64ToBytes(encodedPublicKey);
    if (remotePublicKeyBytes.length !== 65 || compareBytes(localPublicKeyBytes, remotePublicKeyBytes) === 0) {
      throw new Error('The partner supplied an invalid encryption key.');
    }
    remotePublicKey = encodedPublicKey;

    const importedRemoteKey = await crypto.subtle.importKey(
      'raw',
      remotePublicKeyBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: importedRemoteKey },
      keyPair.privateKey,
      256
    );
    const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
    const salt = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(callId));
    const material = new Uint8Array(await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: new TextEncoder().encode('wordcontrol-audio-e2ee-v1'),
      },
      hkdfKey,
      KEY_LENGTH * 2 * 8
    ));

    const firstKey = material.slice(0, KEY_LENGTH);
    const secondKey = material.slice(KEY_LENGTH, KEY_LENGTH * 2);
    const localKeySortsFirst = compareBytes(localPublicKeyBytes, remotePublicKeyBytes) < 0;
    outgoingKey = localKeySortsFirst ? firstKey : secondKey;
    incomingKey = localKeySortsFirst ? secondKey : firstKey;
    keysReady = true;
  };

  const protectSender = (sender) => {
    if (!outgoingKey) throw new Error('The outgoing encryption key is not ready.');
    if (!sender || protectedSenders.has(sender)) return;
    sender.transform = new RTCRtpScriptTransform(worker, {
      operation: 'encrypt',
      key: Array.from(outgoingKey),
      aad: `${callId}:audio:v1`,
    });
    protectedSenders.add(sender);
  };

  const protectReceiver = (receiver) => {
    if (!incomingKey) throw new Error('The incoming encryption key is not ready.');
    if (!receiver || protectedReceivers.has(receiver)) return;
    receiver.transform = new RTCRtpScriptTransform(worker, {
      operation: 'decrypt',
      key: Array.from(incomingKey),
      aad: `${callId}:audio:v1`,
    });
    protectedReceivers.add(receiver);
  };

  return {
    localPublicKey,
    acceptRemotePublicKey,
    protectSender,
    protectReceiver,
    destroy: () => worker.terminate(),
  };
}
