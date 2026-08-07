import { localize } from "../locales";import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isGoogleConfigured, useGoogleIdTokenRequest } from '../services/googleAuth';
import { SUPPORTED_LANGUAGES } from '../languages';
import * as ImagePicker from 'expo-image-picker';
import { HazySelectButton } from '../components/HazySelect';
import * as ImageManipulator from 'expo-image-manipulator';
import { deleteProfilePhoto, getProfilePhoto, uploadProfilePhoto } from '../services/authService';
import { useAppDialog } from '../context/AppDialogContext';
import NestedConfirmDialog from '../components/NestedConfirmDialog';
import * as Clipboard from 'expo-clipboard';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MAX_PHOTO_BYTES = 1024 * 1024;

function base64ByteLength(value) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.ceil(value.length * 3 / 4) - padding;
}

async function compressedProfilePhoto(asset) {
  const dimensions = [1024, 768, 512];
  const qualities = [0.75, 0.55, 0.4];

  for (let index = 0; index < dimensions.length; index += 1) {
    const maximum = dimensions[index];
    const resize = asset.width >= asset.height ? { width: maximum } : { height: maximum };
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize }],
      { compress: qualities[index], format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (result.base64 && base64ByteLength(result.base64) <= MAX_PHOTO_BYTES) {
      const avatar = await ImageManipulator.manipulateAsync(
        result.uri,
        [{ resize: { width: 128, height: 128 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!avatar.base64 || base64ByteLength(avatar.base64) > 100 * 1024) {
        throw new Error('The avatar thumbnail could not be compressed sufficiently.');
      }
      return { photoBase64: result.base64, avatarBase64: avatar.base64 };
    }
  }
  throw new Error('The selected photo could not be compressed below 1 MB.');
}

function initialsFor(user) {
  const source = (user?.name || user?.email || '?').trim();
  return source.charAt(0).toUpperCase();
}

export default function SettingsScreen() {
  const { user, logout, deleteAccount, linkGoogle, updateProfile } = useAuth();
  const dialog = useAppDialog();
  const { colors, scheme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [deleting, setDeleting] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [googleRequest, googleResponse, promptGoogle] = useGoogleIdTokenRequest();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fullProfilePhoto, setFullProfilePhoto] = useState(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [loadingFullPhoto, setLoadingFullPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [appLanguagePickerOpen, setAppLanguagePickerOpen] = useState(false);
  const [pendingAppLanguage, setPendingAppLanguage] = useState(null);
  const [userIdCopied, setUserIdCopied] = useState(false);
  const [userIdRevealed, setUserIdRevealed] = useState(false);
  const selectedAppLanguage = SUPPORTED_LANGUAGES.find((option) => option.code === language) ||
  SUPPORTED_LANGUAGES[0];
  const nextProfileEditAt = user?.profileInfoUpdatedAt ?
  new Date(new Date(user.profileInfoUpdatedAt).getTime() + 14 * 24 * 60 * 60 * 1000) :
  null;
  const profileEditLocked = nextProfileEditAt && nextProfileEditAt > new Date();

  useEffect(() => {
    getProfilePhoto().then(setProfilePhoto).catch(() => {});
  }, []);

  useEffect(() => {setProfileName(user?.name || '');}, [user?.name]);

  const chooseProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const { photoBase64, avatarBase64 } = await compressedProfilePhoto(asset);
      const photo = await uploadProfilePhoto({
        base64: photoBase64,
        avatarBase64,
        contentType: 'image/jpeg'
      });
      setProfilePhoto(photo);
      setFullProfilePhoto(null);
    } catch (error) {
      dialog.alert(localize('Could not update photo'), error.response?.data?.error || error.message);
    } finally {setUploadingPhoto(false);}
  };

  const openProfilePhoto = async () => {
    if (!profilePhoto) {
      chooseProfilePhoto();
      return;
    }
    setPhotoViewerOpen(true);
    if (fullProfilePhoto) return;
    setLoadingFullPhoto(true);
    try {
      setFullProfilePhoto(await getProfilePhoto('full'));
    } catch (error) {
      setPhotoViewerOpen(false);
      dialog.alert(localize('Could not load photo'), error.response?.data?.error || error.message);
    } finally {setLoadingFullPhoto(false);}
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile(profileName);
      setEditingProfile(false);
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      dialog.alert(localize('Could not update profile'), message);
    } finally {setSavingProfile(false);}
  };

  useEffect(() => {
    if (googleResponse?.type !== 'success' || !googleResponse.params?.id_token) return;
    setLinkingGoogle(true);
    linkGoogle(googleResponse.params.id_token).
    then(() => dialog.alert(t('googleLinked'), t('googleLinkedMessage'))).
    catch((err) => {
      dialog.alert(t('googleLinkFailed'), err.response?.data?.error || err.message);
    }).
    finally(() => setLinkingGoogle(false));
  }, [dialog, googleResponse, linkGoogle, t]);

  const copyUserId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    setUserIdCopied(true);
    setTimeout(() => setUserIdCopied(false), 2000);
  };

  const confirmLogout = async () => {
    const confirmed = await dialog.confirm({ title: t('logout'), message: t('logoutQuestion'), confirmText: t('logout'), destructive: true });
    if (confirmed) logout();
  };

  const performAccountDeletion = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      dialog.alert(
        t('accountDeleteFailed'),
        err.response?.data?.error ?? err.message ?? t('tryAgain')
      );
      setDeleting(false);
    }
  };

  const confirmAccountDeletion = async () => {
    const message = t('deleteMessage');
    const confirmed = await dialog.confirm({ title: t('deleteQuestion'), message, confirmText: t('deletePermanently'), cancelText: t('cancel'), destructive: true });
    if (confirmed) performAccountDeletion();
  };

  const confirmAppLanguageChange = (option) => {
    if (option.code === language) {
      setAppLanguagePickerOpen(false);
      return;
    }
    setPendingAppLanguage(option);
  };

  const applyAppLanguageChange = () => {
    setLanguage(pendingAppLanguage.code);
    setPendingAppLanguage(null);
    setAppLanguagePickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{t('my')} </Text>
          <Text style={styles.titleItalic}>{t('settings')}</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Pressable onPress={openProfilePhoto} disabled={uploadingPhoto}>
            <View style={styles.avatar}>
              {profilePhoto ? <Image source={{ uri: profilePhoto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initialsFor(user)}</Text>}
              {uploadingPhoto ? <View style={styles.avatarLoading}><ActivityIndicator color="#fff" /></View> : null}
            </View>
            </Pressable>
            <Pressable style={styles.cameraBadge} onPress={chooseProfilePhoto} disabled={uploadingPhoto} hitSlop={7}>
              <Ionicons name="camera" size={14} color="#155a6a" />
            </Pressable>
          </View>
          {editingProfile ?
          <View style={styles.profileEditWrap}>
              <TextInput style={styles.profileNameInput} value={profileName} onChangeText={setProfileName} maxLength={60} autoFocus />
              <View style={styles.profileEditActions}>
                <Pressable style={styles.profileCancelButton} onPress={() => {setEditingProfile(false);setProfileName(user?.name || '');}}><Text style={styles.profileCancelText}>{localize("Cancel")}</Text></Pressable>
                <Pressable style={[styles.profileSaveButton, (savingProfile || profileName.trim().length < 2) && styles.disabledButton]} disabled={savingProfile || profileName.trim().length < 2} onPress={saveProfile}>
                  {savingProfile ? <ActivityIndicator size="small" color="#155a6a" /> : <Text style={styles.profileSaveText}>{localize("Save")}</Text>}
                </Pressable>
              </View>
            </View> :

          <View style={styles.nameRow}>
              <Text style={styles.name}>{user?.name || t('noName')}</Text>
              <Pressable disabled={profileEditLocked} onPress={() => setEditingProfile(true)} style={profileEditLocked && styles.disabledButton} hitSlop={7}>
                <Ionicons name="pencil" size={17} color={colors.misc.text} />
              </Pressable>
            </View>
          }
          <Text style={styles.email}>{user?.email || t('signedInGoogle')}</Text>
          <Text style={styles.profileCooldown}>
            {profileEditLocked ?
            `Profile information can be changed again on ${nextProfileEditAt.toLocaleDateString()}.` :
            'Profile information can be changed once every 14 days.'}
          </Text>
          {profilePhoto ? <Pressable onPress={async () => {await deleteProfilePhoto();setProfilePhoto(null);setFullProfilePhoto(null);}}><Text style={styles.removePhotoText}>{localize("Remove photo")}</Text></Pressable> : null}
        </View>

        <Text style={styles.sectionLabel}>{t('account')}</Text>
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{localize("Email")}</Text>
              <Text style={styles.optionValue}>{user?.email || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.optionRow}>
            <Ionicons name="finger-print-outline" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{localize("User ID")}</Text>
              <Text style={styles.optionValue} numberOfLines={1}>
                {user?.id ? (userIdRevealed ? user.id : '•'.repeat(Math.min(user.id.length, 24))) : '—'}
              </Text>
            </View>
            <Pressable
              onPress={() => setUserIdRevealed((revealed) => !revealed)}
              disabled={!user?.id}
              hitSlop={8}
              style={styles.copyIdButton}>
              <Ionicons
                name={userIdRevealed ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={copyUserId} disabled={!user?.id} hitSlop={8} style={styles.copyIdButton}>
              <Ionicons
                name={userIdCopied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={userIdCopied ? '#2f9e44' : colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <View style={styles.optionRow}>
            <Ionicons name="logo-google" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{t('googleAccount')}</Text>
              <Text style={styles.optionValue}>{user?.googleId ? t('linked') : t('notLinked')}</Text>
            </View>
            {!user?.googleId && isGoogleConfigured ?
            <Pressable
              style={[styles.linkButton, linkingGoogle && styles.disabledButton]}
              onPress={() => promptGoogle()}
              disabled={!googleRequest || linkingGoogle}>

                {linkingGoogle ?
              <ActivityIndicator size="small" color={colors.misc.text} /> :

              <Text style={styles.linkButtonText}>{t('linkGoogle')}</Text>
              }
              </Pressable> :
            null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('appearance')}</Text>
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name="language-outline" size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{t('language')}</Text>
              <HazySelectButton style={styles.appLanguageSelector} onPress={() => setAppLanguagePickerOpen(true)}>
                <View style={styles.languageIdentity}>
                  <View style={styles.flagCircle}><Text style={styles.flagText}>{selectedAppLanguage.flag}</Text></View>
                  <Text style={styles.appLanguageName}>{selectedAppLanguage.name}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </HazySelectButton>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.optionRow}>
            <Ionicons name={scheme === 'dark' ? 'moon' : 'moon-outline'} size={20} color={colors.textMuted} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{t('darkMode')}</Text>
              <Text style={styles.optionValue}>{scheme === 'dark' ? t('on') : t('off')}</Text>
            </View>
            <Switch
              value={scheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.disabledButton, true: colors.activePill }}
              thumbColor="#fff" />

          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#c0392b" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, deleting && styles.disabledButton]}
          onPress={confirmAccountDeletion}
          disabled={deleting}>

          {deleting ?
          <ActivityIndicator size="small" color="#fff" /> :

          <Ionicons name="trash-outline" size={20} color="#fff" />
          }
          <Text style={styles.deleteText}>
            {deleting ? t('deletingAccount') : t('deleteAccount')}
          </Text>
        </Pressable>
        <Text style={styles.deleteHelp}>
          {t('deleteHelp')}
        </Text>
      </ScrollView>
      <Modal visible={appLanguagePickerOpen} transparent animationType="fade" onRequestClose={() => pendingAppLanguage ? setPendingAppLanguage(null) : setAppLanguagePickerOpen(false)}>
        <Pressable style={styles.languageModalBackdrop} onPress={() => {}}>
          <Pressable style={styles.languageModalCard} onPress={() => {}}>
            <View style={styles.languageModalTitleRow}>
              <Text style={styles.languageModalTitle}>{localize("App language")}</Text>
              <Pressable onPress={() => setAppLanguagePickerOpen(false)} hitSlop={8} accessibilityLabel="Close language picker">
                <Ionicons name="close" size={23} color={colors.textDark} />
              </Pressable>
            </View>
            <Text style={styles.languageModalSubtitle}>{localize("Choose the language used by the application.")}</Text>
            <ScrollView style={styles.languageModalList} contentContainerStyle={styles.languageModalListContent} showsVerticalScrollIndicator persistentScrollbar>
              {SUPPORTED_LANGUAGES.map((option) => {
                const selected = language === option.code;
                return (
                  <Pressable
                    key={option.code}
                    style={[styles.languageModalRow, selected && styles.languageModalRowSelected]}
                    onPress={() => confirmAppLanguageChange(option)}>

                    <View style={styles.languageIdentity}>
                      <View style={styles.flagCircle}><Text style={styles.flagText}>{option.flag}</Text></View>
                      <Text style={styles.appLanguageName}>{option.name}</Text>
                    </View>
                    <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={22} color={selected ? '#22c55e' : colors.textMuted} />
                  </Pressable>);

              })}
            </ScrollView>
            <View style={styles.scrollLanguageHint} pointerEvents="none">
              <Text style={styles.scrollLanguageHintText}>{localize("Scroll for more languages")}</Text>
              <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
            </View>
          </Pressable>
          <NestedConfirmDialog
            visible={Boolean(pendingAppLanguage)}
            title={localize('Change app language?')}
            message={pendingAppLanguage ? `Change the app language to ${pendingAppLanguage.name}?` : ''}
            confirmText={localize('Change language')}
            onCancel={() => setPendingAppLanguage(null)}
            onConfirm={applyAppLanguageChange}
          />
        </Pressable>
      </Modal>
      <Modal visible={photoViewerOpen} transparent animationType="fade" onRequestClose={() => setPhotoViewerOpen(false)}>
        <Pressable style={styles.photoViewerBackdrop} onPress={() => {}}>
          <Pressable style={styles.photoViewerCard} onPress={() => {}}>
            {loadingFullPhoto ?
            <ActivityIndicator size="large" color="#fff" /> :
            fullProfilePhoto ? <Image source={{ uri: fullProfilePhoto }} style={styles.fullProfilePhoto} resizeMode="contain" /> : null}
            <Pressable style={styles.photoViewerClose} onPress={() => setPhotoViewerOpen(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24
  },
  title: { fontSize: 30, lineHeight: 39 },
  titleBold: { fontFamily: titleFont, fontWeight: '700', color: '#fff' },
  titleItalic: { fontFamily: titleFont, fontStyle: 'italic', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    marginBottom: 20
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.activePill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: '100%', height: '100%' },
  avatarLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -4, bottom: -2, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bfeefa', borderWidth: 2, borderColor: colors.cardBg },
  photoViewerBackdrop: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.88)' },
  photoViewerCard: { width: '100%', maxWidth: 720, height: '75%', alignItems: 'center', justifyContent: 'center' },
  fullProfilePhoto: { width: '100%', height: '100%', borderRadius: 16 },
  photoViewerClose: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileCooldown: { maxWidth: 300, marginTop: 8, color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  removePhotoText: { marginTop: 8, color: '#c0392b', fontSize: 12, fontWeight: '700' },
  profileEditWrap: { width: '100%', paddingHorizontal: 20 },
  profileNameInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, color: colors.textDark, backgroundColor: colors.pageBg, fontSize: 16 },
  profileEditActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  profileCancelButton: { minHeight: 36, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  profileCancelText: { color: colors.textDark, fontWeight: '700' },
  profileSaveButton: { minHeight: 36, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#bfeefa' },
  profileSaveText: { color: '#155a6a', fontWeight: '800' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4
  },
  optionsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 20
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14
  },
  optionTextWrap: { flex: 1 },
  copyIdButton: { padding: 6 },
  optionLabel: { fontSize: 13, color: colors.textMuted },
  optionValue: { fontSize: 15, color: colors.textDark, fontWeight: '600', marginTop: 2 },
  appLanguageSelector: { marginTop: 8, paddingHorizontal: 10 },
  languageIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  flagCircle: { width: 34, height: 34, overflow: 'hidden', borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f4', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  flagText: { fontSize: 21, lineHeight: 27 },
  appLanguageName: { color: colors.textDark, fontSize: 15, fontWeight: '700' },
  languageModalBackdrop: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.78)' },
  languageModalCard: { width: '100%', maxWidth: 420, maxHeight: '76%', padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.cardBg },
  languageModalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageModalTitle: { color: colors.textDark, fontSize: 21, fontWeight: '800' },
  languageModalSubtitle: { marginTop: 4, marginBottom: 12, color: colors.textMuted, fontSize: 13 },
  languageModalList: { flexGrow: 0 },
  languageModalListContent: { gap: 8, paddingRight: 3, paddingBottom: 3 },
  languageModalRow: { minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 13 },
  languageModalRowSelected: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  scrollLanguageHint: { minHeight: 34, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderTopWidth: 1, borderTopColor: colors.border },
  scrollLanguageHintText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.misc.text,
    borderRadius: 999
  },
  linkButtonText: { color: colors.misc.text, fontSize: 12, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: '#f1c6c0',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4
  },
  logoutText: { color: '#c0392b', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12
  },
  disabledButton: { opacity: 0.6 },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteHelp: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  }
});
