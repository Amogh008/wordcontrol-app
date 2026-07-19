import * as Google from 'expo-auth-session/providers/google';

export const isGoogleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

// useIdTokenAuthRequest yields a Google idToken directly, which is what the
// backend verifies - no server-side auth-code exchange needed.
export function useGoogleIdTokenRequest() {
  return Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  });
}
