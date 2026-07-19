import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await authService.loadToken();
      if (token) {
        try {
          setUser(await authService.getCurrentUser());
        } catch (err) {
          // Stored token is invalid/expired - fall back to the login screen.
          await authService.logout();
        }
      }
      setInitializing(false);
    })();
  }, []);

  const login = useCallback(async (credentials) => {
    setUser(await authService.login(credentials));
  }, []);

  const register = useCallback(async (credentials) => {
    setUser(await authService.register(credentials));
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setUser(await authService.loginWithGoogle(idToken));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, initializing, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
