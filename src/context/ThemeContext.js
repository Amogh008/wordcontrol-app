import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from '../theme/colors';

const THEME_KEY = 'wordcontrol_theme';

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

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [scheme, setScheme] = useState('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await store.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') setScheme(saved);
      } catch (err) {
        // Ignore - default to light.
      }
    })();
  }, []);

  const setThemeScheme = (next) => {
    setScheme(next);
    store.setItem(THEME_KEY, next).catch(() => {});
  };

  const toggleTheme = () => setThemeScheme(scheme === 'dark' ? 'light' : 'dark');

  const colors = useMemo(() => (scheme === 'dark' ? darkColors : lightColors), [scheme]);

  return (
    <ThemeContext.Provider value={{ scheme, colors, toggleTheme, setThemeScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
