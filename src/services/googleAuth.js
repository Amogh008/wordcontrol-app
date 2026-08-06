import * as Google from 'expo-auth-session/providers/google';

const webClientId = process.env.EXPO_PUBLIC_RUNTIME_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_RUNTIME_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_RUNTIME_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export const isGoogleConfigured = Boolean(webClientId);

// useIdTokenAuthRequest yields a Google idToken directly, which is what the
// backend verifies - no server-side auth-code exchange needed.
export function useGoogleIdTokenRequest() {
  return Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
  });
}
