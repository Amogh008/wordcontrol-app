import { localize } from "../locales";import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const voiceCache = new Map();

async function voiceForLanguage(language) {
  const prefix = language.split('-')[0].toLowerCase();
  if (voiceCache.has(prefix)) return voiceCache.get(prefix);

  const voices = await Speech.getAvailableVoicesAsync();
  const matchingVoices = voices.filter((voice) =>
  voice.language?.toLowerCase().startsWith(prefix)
  );
  const voice =
  matchingVoices.find((candidate) =>
  candidate.language?.toLowerCase().startsWith(language.toLowerCase())
  ) ||
  matchingVoices.find((candidate) => candidate.quality === 'Enhanced') ||
  matchingVoices[0] ||
  null;

  voiceCache.set(prefix, voice);
  return voice;
}

export default function ReadAloudButton({ text, language = 'en-US', compact = false }) {
  const { colors } = useTheme();
  const { language: interfaceLanguage } = useLanguage();
  const isDe = interfaceLanguage === 'de';
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  const handlePress = async () => {
    if (!text?.trim()) return;
    await Speech.stop();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    try {
      const voice = await voiceForLanguage(language);
      Speech.speak(text.trim(), {
        language: voice?.language || language,
        voice: voice?.identifier,
        rate: 0.9,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false)
      });
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!text?.trim()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={speaking ? localize('Stop pronunciation') : localize('Read German word aloud')}
      style={({ pressed }) => [
      styles.button,
      compact && styles.buttonCompact,
      { borderColor: colors.border, backgroundColor: colors.pageBg },
      pressed && styles.pressed]
      }>

      <Ionicons
        name={speaking ? 'stop-circle' : 'volume-high'}
        size={compact ? 17 : 18}
        color={colors.misc.text} />

      {!compact ?
      <Text style={[styles.label, { color: colors.misc.text }]}>
          {speaking ? localize('Stop') : localize('Listen')}
        </Text> :
      null}
    </Pressable>);

}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 999
  },
  buttonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  label: {
    fontSize: 12,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.65
  }
});
