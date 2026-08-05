import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as service from '../services/languageProfileService';
import { setActiveLanguageProfileId } from '../services/languageProfileStore';

const LanguageProfileContext = createContext(null);

export function LanguageProfileProvider({ children }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [activeProfile, setActiveProfileState] = useState(null);
  const [loading, setLoading] = useState(false);

  const choose = useCallback((profile) => {
    setActiveProfileState(profile || null);
    setActiveLanguageProfileId(profile?.id);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      choose(null);
      return;
    }
    setLoading(true);
    try {
      const data = await service.getLanguageProfiles();
      setProfiles(data.profiles);
      setSupportedLanguages(data.supportedLanguages);
      setActiveProfileState((current) => {
        const next = data.profiles.find((profile) => profile.id === current?.id)
          || data.profiles.find((profile) => profile.language === 'de')
          || data.profiles[0];
        setActiveLanguageProfileId(next?.id);
        return next || null;
      });
    } finally { setLoading(false); }
  }, [choose, user]);

  useEffect(() => { refresh().catch(console.warn); }, [refresh]);

  const addProfile = useCallback(async (language) => {
    const created = await service.createLanguageProfile(language);
    setProfiles((current) => [...current.filter((item) => item.id !== created.id), created]);
    choose(created);
    return created;
  }, [choose]);

  const deleteProfile = useCallback(async (profile) => {
    await service.deleteLanguageProfile(profile.id);
    const remaining = profiles.filter((item) => item.id !== profile.id);
    setProfiles(remaining);
    if (activeProfile?.id === profile.id) choose(remaining[0] || null);
  }, [activeProfile?.id, choose, profiles]);

  const value = useMemo(() => ({ profiles, supportedLanguages, activeProfile, loading, choose, addProfile, deleteProfile, refresh }),
    [profiles, supportedLanguages, activeProfile, loading, choose, addProfile, deleteProfile, refresh]);
  return <LanguageProfileContext.Provider value={value}>{children}</LanguageProfileContext.Provider>;
}

export function useLanguageProfile() {
  const value = useContext(LanguageProfileContext);
  if (!value) throw new Error('useLanguageProfile must be used within LanguageProfileProvider');
  return value;
}
