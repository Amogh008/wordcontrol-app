import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    store.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'de') setLanguageState(saved);
      })
      .catch(() => {});
  }, []);

  const setLanguage = (next) => {
    if (next !== 'en' && next !== 'de') return;
    setLanguageState(next);
    store.setItem(LANGUAGE_KEY, next).catch(() => {});
  };

  const strings = language === 'de' ? de : en;
  const value = useMemo(
    () => ({ language, setLanguage, t: (key) => strings[key] ?? en[key] ?? key }),
    [language, strings],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within a LanguageProvider');
  return value;
}
