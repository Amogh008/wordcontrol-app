import generatedPacks from './packs';

let activeLanguage = 'en';
const packs = { ...generatedPacks };

export function setActiveLocale(language) {
  activeLanguage = language || 'en';
}

export function registerLocale(language, translations) {
  packs[language] = translations || {};
}

export function localize(english) {
  if (typeof english !== 'string') return english;
  if (activeLanguage === 'en') return english;
  return packs[activeLanguage]?.[english] ?? english;
}

export function localizeFormat(english, values = []) {
  return localize(english).replace(/\{(\d+)\}/g, (_match, index) => String(values[Number(index)] ?? ''));
}
