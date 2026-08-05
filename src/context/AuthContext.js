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
    return authService.register(credentials);
  }, []);

  const verifyEmail = useCallback(async (verification) => {
    setUser(await authService.verifyEmail(verification));
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setUser(await authService.loginWithGoogle(idToken));
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return authService.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (details) => {
    return authService.resetPassword(details);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    setUser(null);
  }, []);

  const linkGoogle = useCallback(async (idToken) => {
    const updatedUser = await authService.linkGoogle(idToken);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const updateProfile = useCallback(async (name) => {
    const updatedUser = await authService.updateProfile(name);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        register,
        verifyEmail,
        forgotPassword,
        resetPassword,
        loginWithGoogle,
        linkGoogle,
        updateProfile,
        logout,
        deleteAccount,
      }}
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
