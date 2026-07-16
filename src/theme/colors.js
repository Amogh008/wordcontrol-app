export const colors = {
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

export const articles = ['der', 'die', 'das', 'misc'];

// Articles a user can actually pick in the form. "misc" isn't a real
// German article — it's what a word becomes when no article is picked.
export const selectableArticles = ['der', 'die', 'das'];
