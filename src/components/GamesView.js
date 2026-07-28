import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectableArticles } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const GOOD = { text: '#2f9e44', bg: '#d3f9d8', border: '#2f9e44' };
const BAD = { text: '#c92a2a', bg: '#ffe3e3', border: '#c92a2a' };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isNoun(w) {
  return selectableArticles.includes(w.artikel);
}

function Scoreboard({ score, answered, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.scoreRow}>
      <Pressable onPress={onExit} hitSlop={8} style={styles.exitButton}>
        <Ionicons name="chevron-back" size={20} color={colors.textDark} />
        <Text style={styles.exitText}>Spiele</Text>
      </Pressable>
      <Text style={styles.scoreText}>
        Richtig: {score} / {answered}
      </Text>
    </View>
  );
}

function EmptyState({ message, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>{message}</Text>
      <Pressable onPress={onExit} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Zurück zu Spiele</Text>
      </Pressable>
    </View>
  );
}

function Flashcards({ words, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pool = useMemo(
    () => words.filter((word) => word.wort && word.bedeutung),
    [words],
  );
  const [cardIndex, setCardIndex] = useState(() =>
    pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0,
  );

  if (pool.length === 0) {
    return (
      <EmptyState
        message="Du brauchst mindestens ein gespeichertes Wort mit Bedeutung für die Lernkarten."
        onExit={onExit}
      />
    );
  }

  const card = pool[cardIndex % pool.length];
  const articleColors = colors[card.artikel] ?? colors.misc;

  const drawNext = () => {
    if (pool.length === 1) {
      setCardIndex((index) => index + 1);
      return;
    }

    setCardIndex((current) => {
      const nextOffset = 1 + Math.floor(Math.random() * (pool.length - 1));
      return (current + nextOffset) % pool.length;
    });
  };

  return (
    <View style={styles.gameArea}>
      <View style={styles.scoreRow}>
        <Pressable onPress={onExit} hitSlop={8} style={styles.exitButton}>
          <Ionicons name="chevron-back" size={20} color={colors.textDark} />
          <Text style={styles.exitText}>Spiele</Text>
        </Pressable>
        <Text style={styles.scoreText}>{pool.length} Lernkarten</Text>
      </View>

      <ScrollView contentContainerStyle={styles.flashcardBody}>
        <Text style={styles.questionLabel}>Zufällige Lernkarte</Text>
        <View style={[styles.flashcard, { borderColor: articleColors.text }]}>
          <View style={[styles.flashcardBadge, { backgroundColor: articleColors.bg }]}>
            <Text style={[styles.flashcardBadgeText, { color: articleColors.text }]}>
              {card.artikel || 'Wort'}
            </Text>
          </View>

          <Text style={[styles.flashcardWord, { color: articleColors.text }]}>
            {card.artikel ? `${card.artikel} ${card.wort}` : card.wort}
          </Text>

          <View style={styles.flashcardDivider} />

          <Text style={styles.flashcardLabel}>BEDEUTUNG</Text>
          <Text style={styles.flashcardMeaning}>{card.bedeutung}</Text>

          {card.notizen ? (
            <>
              <Text style={styles.flashcardLabel}>NOTIZEN</Text>
              <Text style={styles.flashcardNotes}>{card.notizen}</Text>
            </>
          ) : null}
        </View>

        <Pressable style={styles.flashcardNextButton} onPress={drawNext}>
          <Ionicons name="shuffle" size={19} color={colors.misc.text} />
          <Text style={styles.flashcardNextText}>Nächste zufällige Karte</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MeaningGame({ words, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pool = useMemo(() => words.filter((w) => w.wort && w.bedeutung), [words]);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const question = useMemo(() => {
    if (pool.length < 2) return null;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const distractors = shuffle(
      pool
        .filter((w) => (w.id ?? w._id) !== (correct.id ?? correct._id))
        .map((w) => w.bedeutung)
        .filter((b) => b && b !== correct.bedeutung)
    )
      .filter((b, i, a) => a.indexOf(b) === i)
      .slice(0, 3);
    return { correct, options: shuffle([correct.bedeutung, ...distractors]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, round]);

  if (!question) {
    return (
      <EmptyState
        message="Du brauchst mindestens 2 Wörter mit Bedeutung, um dieses Spiel zu spielen."
        onExit={onExit}
      />
    );
  }

  const answer = (option) => {
    if (selected) return;
    setSelected(option);
    setAnswered((n) => n + 1);
    if (option === question.correct.bedeutung) setScore((s) => s + 1);
  };

  const next = () => {
    setSelected(null);
    setRound((r) => r + 1);
  };

  const prompt = question.correct.artikel
    ? `${question.correct.artikel} ${question.correct.wort}`
    : question.correct.wort;

  return (
    <View style={styles.gameArea}>
      <Scoreboard score={score} answered={answered} onExit={onExit} />
      <ScrollView contentContainerStyle={styles.gameBody} keyboardShouldPersistTaps="handled">
        <Text style={styles.questionLabel}>Was bedeutet …</Text>
        <View style={styles.promptCard}>
          <Text style={styles.promptWord}>{prompt}</Text>
        </View>

        {question.options.map((option) => {
          const isCorrect = option === question.correct.bedeutung;
          const isChosen = option === selected;
          let optStyle = styles.optionNeutral;
          let optTextStyle = styles.optionText;
          if (selected) {
            if (isCorrect) {
              optStyle = { backgroundColor: GOOD.bg, borderColor: GOOD.border };
              optTextStyle = { color: GOOD.text, fontWeight: '700' };
            } else if (isChosen) {
              optStyle = { backgroundColor: BAD.bg, borderColor: BAD.border };
              optTextStyle = { color: BAD.text, fontWeight: '700' };
            } else {
              optStyle = { ...styles.optionNeutral, opacity: 0.5 };
            }
          }
          return (
            <Pressable
              key={option}
              style={[styles.option, optStyle]}
              onPress={() => answer(option)}
              disabled={!!selected}
            >
              <Text style={[styles.optionText, optTextStyle]}>{option}</Text>
              {selected && isCorrect ? (
                <Ionicons name="checkmark-circle" size={20} color={GOOD.text} />
              ) : null}
              {selected && isChosen && !isCorrect ? (
                <Ionicons name="close-circle" size={20} color={BAD.text} />
              ) : null}
            </Pressable>
          );
        })}

        {selected ? (
          <Pressable style={styles.nextButton} onPress={next}>
            <Text style={styles.nextButtonText}>Weiter</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ArtikelGame({ words, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pool = useMemo(() => words.filter(isNoun), [words]);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const question = useMemo(() => {
    if (pool.length < 1) return null;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, round]);

  if (!question) {
    return (
      <EmptyState
        message="Du brauchst mindestens ein Substantiv mit Artikel (der/die/das), um dieses Spiel zu spielen."
        onExit={onExit}
      />
    );
  }

  const answer = (artikel) => {
    if (selected) return;
    setSelected(artikel);
    setAnswered((n) => n + 1);
    if (artikel === question.artikel) setScore((s) => s + 1);
  };

  const next = () => {
    setSelected(null);
    setRound((r) => r + 1);
  };

  return (
    <View style={styles.gameArea}>
      <Scoreboard score={score} answered={answered} onExit={onExit} />
      <ScrollView contentContainerStyle={styles.gameBody}>
        <Text style={styles.questionLabel}>Welcher Artikel?</Text>
        <View style={styles.promptCard}>
          <Text style={styles.promptWord}>{question.wort}</Text>
          {question.bedeutung ? (
            <Text style={styles.promptMeaning}>{question.bedeutung}</Text>
          ) : null}
        </View>

        <View style={styles.artikelRow}>
          {selectableArticles.map((artikel) => {
            const isCorrect = artikel === question.artikel;
            const isChosen = artikel === selected;
            const base = colors[artikel];
            let boxStyle = { backgroundColor: base.bg, borderColor: base.bg };
            let txtColor = base.text;
            if (selected) {
              if (isCorrect) {
                boxStyle = { backgroundColor: GOOD.bg, borderColor: GOOD.border };
                txtColor = GOOD.text;
              } else if (isChosen) {
                boxStyle = { backgroundColor: BAD.bg, borderColor: BAD.border };
                txtColor = BAD.text;
              } else {
                boxStyle = { backgroundColor: base.bg, borderColor: base.bg, opacity: 0.45 };
              }
            }
            return (
              <Pressable
                key={artikel}
                style={[styles.artikelButton, boxStyle]}
                onPress={() => answer(artikel)}
                disabled={!!selected}
              >
                <Text style={[styles.artikelButtonText, { color: txtColor }]}>{artikel}</Text>
              </Pressable>
            );
          })}
        </View>

        {selected ? (
          <>
            <Text style={[styles.feedbackText, { color: selected === question.artikel ? GOOD.text : BAD.text }]}>
              {selected === question.artikel
                ? 'Richtig!'
                : `Falsch — es ist "${question.artikel} ${question.wort}".`}
            </Text>
            <Pressable style={styles.nextButton} onPress={next}>
              <Text style={styles.nextButtonText}>Weiter</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export default function GamesView({ words }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [game, setGame] = useState(null);

  if (game === 'meaning') return <MeaningGame words={words} onExit={() => setGame(null)} />;
  if (game === 'artikel') return <ArtikelGame words={words} onExit={() => setGame(null)} />;
  if (game === 'flashcards') return <Flashcards words={words} onExit={() => setGame(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.menu}>
      <Pressable style={styles.menuCard} onPress={() => setGame('meaning')}>
        <View style={[styles.menuIcon, { backgroundColor: colors.das.bg }]}>
          <Ionicons name="bulb" size={26} color={colors.das.text} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Bedeutung raten</Text>
          <Text style={styles.menuSubtitle}>Wähle die richtige Bedeutung des Wortes.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.menuCard} onPress={() => setGame('artikel')}>
        <View style={[styles.menuIcon, { backgroundColor: colors.der.bg }]}>
          <Ionicons name="text" size={26} color={colors.der.text} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Artikel raten</Text>
          <Text style={styles.menuSubtitle}>der, die oder das? Rate den Artikel des Substantivs.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.menuCard} onPress={() => setGame('flashcards')}>
        <View style={[styles.menuIcon, { backgroundColor: colors.misc.bg }]}>
          <Ionicons name="albums" size={26} color={colors.misc.text} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Lernkarten</Text>
          <Text style={styles.menuSubtitle}>
            Ziehe zufällige Karten mit Wort, Bedeutung und Notizen.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  menu: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textDark,
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },
  gameArea: {
    flex: 1,
  },
  gameBody: {
    paddingTop: 8,
    paddingBottom: 30,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  promptCard: {
    backgroundColor: colors.headerBg,
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  promptWord: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  promptMeaning: {
    marginTop: 8,
    fontSize: 15,
    color: '#cfc9bd',
    textAlign: 'center',
  },
  flashcardBody: {
    paddingTop: 8,
    paddingBottom: 30,
  },
  flashcard: {
    minHeight: 320,
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  flashcardBadge: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginBottom: 14,
  },
  flashcardBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  flashcardWord: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  flashcardDivider: {
    width: 64,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 22,
  },
  flashcardLabel: {
    marginTop: 4,
    marginBottom: 5,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  flashcardMeaning: {
    marginBottom: 18,
    color: colors.textDark,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  flashcardNotes: {
    color: colors.textDark,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  flashcardNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.misc.text,
    borderRadius: 10,
    backgroundColor: colors.misc.bg,
  },
  flashcardNextText: {
    color: colors.misc.text,
    fontSize: 15,
    fontWeight: '800',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionNeutral: {
    backgroundColor: colors.cardBg,
    borderColor: colors.border,
  },
  optionText: {
    fontSize: 16,
    color: colors.textDark,
    flex: 1,
  },
  artikelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  artikelButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
  },
  artikelButtonText: {
    fontSize: 20,
    fontWeight: '900',
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: colors.headerBg,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.headerBg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
