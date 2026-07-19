export const lightColors = {
  headerBg: '#211d17',
  pageBg: '#f7f4ee',
  cardBg: '#ffffff',
  border: '#e3ddd0',
  textDark: '#2b2620',
  textMuted: '#8c867a',
  placeholder: '#a39e93',

  der: { text: '#3b5bdb', bg: '#dbe4ff' },
  die: { text: '#c2255c', bg: '#ffdeeb' },
  das: { text: '#2f9e44', bg: '#d3f9d8' },
  misc: { text: '#7048e8', bg: '#e5dbff' },

  activePill: '#211d17',
  disabledButton: '#a8a29b',
};

export const darkColors = {
  headerBg: '#17140f',
  pageBg: '#121110',
  cardBg: '#201c17',
  border: '#37332b',
  textDark: '#f1ede4',
  textMuted: '#a89f8f',
  placeholder: '#726b5d',

  der: { text: '#8ba4ff', bg: '#232a44' },
  die: { text: '#ff8fb8', bg: '#3d2431' },
  das: { text: '#79dd8f', bg: '#1e3626' },
  misc: { text: '#bda3ff', bg: '#2c2444' },

  activePill: '#413b2e',
  disabledButton: '#4a4638',
};

// Kept for any code that hasn't migrated to useTheme() yet.
export const colors = lightColors;

export const articles = ['der', 'die', 'das', 'misc'];

// Articles a user can actually pick in the form. "misc" isn't a real
// German article — it's what a word becomes when no article is picked.
export const selectableArticles = ['der', 'die', 'das'];
