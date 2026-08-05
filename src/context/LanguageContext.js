import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SUPPORTED_LANGUAGE_CODES } from '../languages';
import { localize, setActiveLocale } from '../locales';

const LANGUAGE_KEY = 'dlt_interface_language';

const webStore = {
  async getItem(key) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};

const store = Platform.OS === 'web'
  ? webStore
  : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync };

const de = {
  words: 'Wörter', translate: 'Übersetzer', dictionary: 'Wörterbuch', grammar: 'Grammatik',
  notes: 'Notizen', games: 'Spiele', settings: 'Einstellungen', my: 'Meine', account: 'KONTO',
  appearance: 'DARSTELLUNG', language: 'App-Sprache', english: 'Englisch', german: 'Deutsch',
  darkMode: 'Dunkelmodus', on: 'An', off: 'Aus', linked: 'Verknüpft', notLinked: 'Nicht verknüpft',
  googleAccount: 'Google-Konto', linkGoogle: 'Google verknüpfen', noName: 'Kein Name angegeben',
  signedInGoogle: 'Mit Google angemeldet', logout: 'Abmelden', logoutQuestion: 'Möchtest du dich wirklich abmelden?',
  cancel: 'Abbrechen', deleteAccount: 'Konto löschen', deletingAccount: 'Konto wird gelöscht…',
  deleteQuestion: 'Konto löschen?', deletePermanently: 'Endgültig löschen',
  deleteMessage: 'Dadurch werden dein Konto, deine gespeicherten Wörter und Notizen endgültig gelöscht. Dies kann nicht rückgängig gemacht werden.',
  deleteHelp: 'Entfernt dein Konto, deine Wörter und Notizen dauerhaft.',
  googleLinked: 'Google verknüpft', googleLinkedMessage: 'Du kannst dich jetzt mit Google anmelden.',
  googleLinkFailed: 'Google konnte nicht verknüpft werden', accountDeleteFailed: 'Konto konnte nicht gelöscht werden',
  tryAgain: 'Bitte versuche es erneut.',
  languageLab: 'Lab', network: 'Netzwerk',
};

const en = {
  words: 'Words', translate: 'Translate', dictionary: 'Dictionary', grammar: 'Grammar', notes: 'Notes',
  games: 'Games', settings: 'Settings', my: 'My', account: 'ACCOUNT', appearance: 'APPEARANCE',
  language: 'App language', english: 'English', german: 'Deutsch', darkMode: 'Dark mode', on: 'On', off: 'Off',
  linked: 'Linked', notLinked: 'Not linked', googleAccount: 'Google account', linkGoogle: 'Link Google',
  noName: 'No name set', signedInGoogle: 'Signed in with Google', logout: 'Log out',
  logoutQuestion: 'Are you sure you want to log out?', cancel: 'Cancel', deleteAccount: 'Delete account',
  deletingAccount: 'Deleting account…', deleteQuestion: 'Delete account?', deletePermanently: 'Delete permanently',
  deleteMessage: 'This permanently deletes your account, saved vocabulary, and notes. This cannot be undone.',
  deleteHelp: 'Permanently removes your account, vocabulary, and notes.', googleLinked: 'Google linked',
  googleLinkedMessage: 'You can now sign in using Google.', googleLinkFailed: 'Could not link Google',
  accountDeleteFailed: 'Account could not be deleted', tryAgain: 'Please try again.',
  languageLab: 'Lab', network: 'Network',
};

const ko = {
  words: '단어', translate: '번역', dictionary: '사전', grammar: '문법', notes: '노트',
  games: '게임', settings: '설정', my: '내', account: '계정', appearance: '화면 설정',
  language: '앱 언어', english: '영어', german: '독일어', darkMode: '다크 모드', on: '켜짐', off: '꺼짐',
  linked: '연결됨', notLinked: '연결되지 않음', googleAccount: 'Google 계정', linkGoogle: 'Google 연결',
  noName: '이름 없음', signedInGoogle: 'Google로 로그인됨', logout: '로그아웃',
  logoutQuestion: '로그아웃하시겠습니까?', cancel: '취소', deleteAccount: '계정 삭제',
  deletingAccount: '계정 삭제 중…', deleteQuestion: '계정을 삭제하시겠습니까?', deletePermanently: '영구 삭제',
  deleteMessage: '계정과 저장된 단어 및 노트가 영구적으로 삭제됩니다. 이 작업은 취소할 수 없습니다.',
  deleteHelp: '계정, 단어 및 노트를 영구적으로 삭제합니다.', googleLinked: 'Google 연결 완료',
  googleLinkedMessage: '이제 Google로 로그인할 수 있습니다.', googleLinkFailed: 'Google을 연결할 수 없습니다',
  accountDeleteFailed: '계정을 삭제할 수 없습니다', tryAgain: '다시 시도해 주세요.',
  languageLab: '랩', network: '네트워크',
};

const TRANSLATIONS = { en, de, ko };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  setActiveLocale(language);

  useEffect(() => {
    store.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (SUPPORTED_LANGUAGE_CODES.includes(saved)) setLanguageState(saved);
      })
      .catch(() => {});
  }, []);

  const setLanguage = (next) => {
    if (!SUPPORTED_LANGUAGE_CODES.includes(next)) return;
    setLanguageState(next);
    store.setItem(LANGUAGE_KEY, next).catch(() => {});
  };

  const value = useMemo(
    () => ({ language, setLanguage, t: (key) => localize(en[key] ?? key) }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within a LanguageProvider');
  return value;
}
