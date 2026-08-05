import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SpeakingNetworkView from '../components/SpeakingNetworkView';
import { useTheme } from '../context/ThemeContext';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { localize, localizeFormat } from '../locales';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function SpeakingNetworkScreen() {
  const { colors } = useTheme();
  const { activeProfile } = useLanguageProfile();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.pageBg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.title}>{localize('My Networks')}</Text>
        <Text style={styles.subtitle}>
          {localizeFormat('Find learning partners, practise {0} and make new connections.', [
            activeProfile?.englishName || 'German',
          ])}
        </Text>
      </View>
      <View style={styles.body}>
        <SpeakingNetworkView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  title: { color: '#fff', fontFamily: titleFont, fontSize: 30, fontWeight: '700' },
  subtitle: { marginTop: 6, color: '#cfc9bd', fontSize: 14, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
});
