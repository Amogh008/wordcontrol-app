let activeProfileId = null;

export function getActiveLanguageProfileId() {
  return activeProfileId;
}

export function setActiveLanguageProfileId(id) {
  activeProfileId = id || null;
}

export function applyLanguageProfileHeader(config) {
  const profileId = getActiveLanguageProfileId();
  if (profileId) config.headers['X-Language-Profile-Id'] = profileId;
  return config;
}
