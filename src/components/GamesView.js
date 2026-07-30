import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectableArticles } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { streamStory, translateText } from '../services/wordsService';
import ReadAloudButton from './ReadAloudButton';

const GOOD = { text: '#2f9e44', bg: '#d3f9d8', border: '#2f9e44' };
const BAD = { text: '#c92a2a', bg: '#ffe3e3', border: '#c92a2a' };
const STORY_LEVELS = [
  { id: 'A1', title: 'A1 · Anfänger', description: 'Sehr kurze, einfache Sätze und vertraute Wörter' },
  { id: 'A2', title: 'A2 · Grundkenntnisse', description: 'Einfache Sätze mit etwas mehr Abwechslung' },
  { id: 'B1', title: 'B1 · Mittelstufe', description: 'Natürlichere Sätze und eine ausführlichere Handlung' },
];

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

function InteractiveParagraph({
  paragraph,
  words,
  onPress,
  translationMode = false,
  onTranslate,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const lookup = useMemo(
    () =>
      new Map(
        words
          .filter((word) => word.wort)
          .map((word) => [word.wort.toLocaleLowerCase('de-DE'), word]),
    ),
    [words],
  );
  const sentences = useMemo(
    () => paragraph.match(/[^.!?…]+(?:[.!?…]+["'»“”]?|$)\s*/gu) || [paragraph],
    [paragraph],
  );

  return (
    <Text style={styles.storyParagraph}>
      {sentences.map((sentence, sentenceIndex) => (
        <Text
          key={`${sentenceIndex}-${sentence.slice(0, 20)}`}
          onPress={translationMode ? () => onTranslate(sentence.trim()) : undefined}
        >
          {sentence.split(/(\p{L}+(?:[’'-]\p{L}+)*)/gu).map((part, partIndex) => {
            if (!/^\p{L}/u.test(part)) {
              return <Text key={`${partIndex}-${part}`}>{part}</Text>;
            }
            const savedWord = lookup.get(part.toLocaleLowerCase('de-DE'));
            const word = savedWord ?? { wort: part };
            return (
              <Text
                key={`${partIndex}-${part}`}
                style={[
                  styles.storyClickableWord,
                  savedWord && styles.storyInteractiveWord,
                ]}
                onPress={
                  translationMode
                    ? undefined
                    : (event) => {
                        event.stopPropagation();
                        onPress(word);
                      }
                }
              >
                {part}
              </Text>
            );
          })}
        </Text>
      ))}
    </Text>
  );
}

function TranslatableParagraph({ paragraph, words, onTranslate }) {
  return (
    <InteractiveParagraph
      paragraph={paragraph}
      words={words}
      translationMode
      onTranslate={onTranslate}
    />
  );
}

function StoryActivity({ words, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const vocabulary = useMemo(
    () => words.filter((word) => word.wort && word.bedeutung),
    [words],
  );
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeWord, setActiveWord] = useState(null);
  const [translationMode, setTranslationMode] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [remainingWords, setRemainingWords] = useState(() => shuffle(vocabulary));
  const [usedWords, setUsedWords] = useState([]);
  const [roundWords, setRoundWords] = useState([]);
  const [showSessionWords, setShowSessionWords] = useState(false);
  const [level, setLevel] = useState(null);
  const translationRequest = useRef(0);
  const wordMeaningRequest = useRef(0);
  const wordMeaningCache = useRef(new Map());
  const lastSelection = useRef({ text: '', time: 0 });

  const storyFromStreamText = (text) => {
    const normalized = text.replace(/\r\n/g, '\n');
    const newline = normalized.indexOf('\n');
    if (newline === -1) return { title: normalized.trim(), paragraphs: [] };
    const title = normalized.slice(0, newline).trim();
    const body = normalized.slice(newline + 1).trim();
    const paragraphs = body ? body.split(/\n\s*\n/).map((part) => part.trim()) : [];
    return { title, paragraphs };
  };

  const createStory = async (batch = roundWords, storyLevel = level) => {
    if (batch.length === 0 || loading || !storyLevel) return;
    setLoading(true);
    setError('');
    setActiveWord(null);
    wordMeaningRequest.current += 1;
    setTranslation(null);
    translationRequest.current += 1;
    setStory(null);
    setRoundWords(batch);
    try {
      let streamedText = '';
      const completedStory = await streamStory({
        wordIds: batch.map((word) => word.id ?? word._id),
        level: storyLevel,
        onDelta: (text) => {
          streamedText += text;
          setStory(storyFromStreamText(streamedText));
        },
      });
      setStory(completedStory);
      setUsedWords((current) => {
        const existing = new Set(current.map((word) => String(word.id ?? word._id)));
        return [...current, ...batch.filter((word) => !existing.has(String(word.id ?? word._id)))];
      });
      const completedIds = new Set(batch.map((word) => String(word.id ?? word._id)));
      setRemainingWords((current) =>
        current.filter((word) => !completedIds.has(String(word.id ?? word._id))),
      );
    } catch (err) {
      setError(err.message ?? 'Die Geschichte konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const continueSession = () => {
    createStory(remainingWords.slice(0, 30));
  };

  const resetSession = () => {
    if (loading) return;
    const freshQueue = shuffle(vocabulary);
    setRemainingWords(freshQueue);
    setUsedWords([]);
    setRoundWords([]);
    setStory(null);
    setError('');
    setShowSessionWords(false);
    setLevel(null);
  };

  if (vocabulary.length === 0) {
    return (
      <EmptyState
        message="Speichere mindestens ein Wort mit Bedeutung, um eine Geschichte zu erstellen."
        onExit={onExit}
      />
    );
  }

  if (!level) {
    return (
      <View style={styles.gameArea}>
        <View style={styles.scoreRow}>
          <Pressable onPress={onExit} hitSlop={8} style={styles.exitButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textDark} />
            <Text style={styles.exitText}>Spiele</Text>
          </Pressable>
        </View>
        <View style={styles.storyLevelScreen}>
          <Ionicons name="book-outline" size={34} color={colors.misc.text} />
          <Text style={styles.storyLevelTitle}>Wähle dein Sprachniveau</Text>
          <Text style={styles.storyLevelIntro}>
            Die Geschichte wird passend zu deinem aktuellen Deutsch-Niveau geschrieben.
          </Text>
          <View style={styles.storyLevelOptions}>
            {STORY_LEVELS.map((option) => (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.storyLevelOption,
                  pressed && styles.storyLevelOptionPressed,
                ]}
                onPress={() => {
                  setLevel(option.id);
                  createStory(remainingWords.slice(0, 30), option.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${option.title}: ${option.description}`}
              >
                <View style={styles.storyLevelBadge}>
                  <Text style={styles.storyLevelBadgeText}>{option.id}</Text>
                </View>
                <View style={styles.storyLevelCopy}>
                  <Text style={styles.storyLevelOptionTitle}>{option.title}</Text>
                  <Text style={styles.storyLevelDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const handleWordPress = async (word) => {
    const id = word.id ?? word._id ?? word.wort;
    const currentId =
      activeWord?.word?.id ?? activeWord?.word?._id ?? activeWord?.word?.wort;
    if (activeWord?.pinned && currentId === id) {
      wordMeaningRequest.current += 1;
      setActiveWord(null);
      return;
    }

    if (word.bedeutung) {
      wordMeaningRequest.current += 1;
      setActiveWord({ word, pinned: true });
      return;
    }

    const cacheKey = word.wort.toLocaleLowerCase('de-DE');
    const cachedMeaning = wordMeaningCache.current.get(cacheKey);
    if (cachedMeaning) {
      setActiveWord({
        word: { ...word, bedeutung: cachedMeaning },
        pinned: true,
      });
      return;
    }

    const requestId = wordMeaningRequest.current + 1;
    wordMeaningRequest.current = requestId;
    setActiveWord({ word, pinned: true, loading: true, error: '' });
    try {
      const { translation: meaning } = await translateText({
        text: word.wort,
        from: 'de',
        to: 'en',
      });
      if (wordMeaningRequest.current === requestId) {
        wordMeaningCache.current.set(cacheKey, meaning);
        setActiveWord({
          word: { ...word, bedeutung: meaning },
          pinned: true,
          loading: false,
          error: '',
        });
      }
    } catch (err) {
      if (wordMeaningRequest.current === requestId) {
        setActiveWord({
          word,
          pinned: true,
          loading: false,
          error:
            err.response?.data?.error ??
            err.message ??
            'Die Bedeutung konnte nicht geladen werden.',
        });
      }
    }
  };
  const handleTranslate = async (selectedText) => {
    const source = selectedText.replace(/\s+/g, ' ').trim();
    if (!source) return;

    const now = Date.now();
    if (lastSelection.current.text === source && now - lastSelection.current.time < 500) return;
    lastSelection.current = { text: source, time: now };

    const requestId = translationRequest.current + 1;
    translationRequest.current = requestId;
    setActiveWord(null);
    setTranslation({ source, text: '', loading: true, error: '' });
    try {
      const { translation: translatedText } = await translateText({
        text: source,
        from: 'de',
        to: 'en',
      });
      if (translationRequest.current === requestId) {
        setTranslation({ source, text: translatedText, loading: false, error: '' });
      }
    } catch (err) {
      if (translationRequest.current === requestId) {
        setTranslation({
          source,
          text: '',
          loading: false,
          error: err.response?.data?.error ?? err.message ?? 'Übersetzung fehlgeschlagen.',
        });
      }
    }
  };
  const toggleTranslationMode = () => {
    setTranslationMode((enabled) => {
      const next = !enabled;
      setActiveWord(null);
      setTranslation(null);
      translationRequest.current += 1;
      return next;
    });
  };

  return (
    <Pressable
      style={styles.gameArea}
      onPress={() => {
        if (!activeWord) return;
        wordMeaningRequest.current += 1;
        setActiveWord(null);
      }}
    >
      <View style={styles.scoreRow}>
        <Pressable onPress={onExit} hitSlop={8} style={styles.exitButton}>
          <Ionicons name="chevron-back" size={20} color={colors.textDark} />
          <Text style={styles.exitText}>Spiele</Text>
        </Pressable>
        <Pressable style={styles.storyResetButton} onPress={resetSession} disabled={loading}>
          <Ionicons name="refresh" size={16} color={colors.misc.text} />
          <Text style={styles.storyResetText}>Sitzung zurücksetzen</Text>
        </Pressable>
      </View>

      {story?.title ? (
        <View style={styles.storyStickyControls}>
          <Pressable
            style={[
              styles.storyTranslateToggle,
              translationMode && styles.storyTranslateToggleActive,
            ]}
            onPress={toggleTranslationMode}
            accessibilityRole="switch"
            accessibilityState={{ checked: translationMode }}
            accessibilityLabel="Satz übersetzen"
          >
            <Text
              style={[
                styles.storyTranslateToggleText,
                translationMode && styles.storyTranslateToggleTextActive,
              ]}
            >
              Satz übersetzen
            </Text>
            <View
              style={[
                styles.storyTranslateSwitchTrack,
                translationMode && styles.storyTranslateSwitchTrackActive,
              ]}
            >
              <View
                style={[
                  styles.storyTranslateSwitchThumb,
                  translationMode && styles.storyTranslateSwitchThumbActive,
                ]}
              />
            </View>
          </Pressable>
          {translationMode ? (
            <Text style={styles.storyTranslateHint}>
              Tippe auf einen Satz oder markiere einen beliebigen Textabschnitt.
            </Text>
          ) : null}
        </View>
      ) : null}

      {loading && !story?.title ? (
        <View style={styles.storyLoading}>
          <ActivityIndicator size="large" color={colors.misc.text} />
          <Text style={styles.storyLoadingText}>KI schreibt deine Geschichte…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.storyBody}>
          <Pressable
            style={styles.storyProgressLink}
            onPress={() => setShowSessionWords(true)}
            accessibilityRole="button"
            accessibilityLabel="Verwendete Wörter dieser Runde und Sitzung anzeigen"
          >
            <Ionicons name="list-circle-outline" size={19} color={colors.misc.text} />
            <Text style={styles.storyProgressLinkText}>
              {roundWords.length} Wörter in dieser Runde · {usedWords.length}/{vocabulary.length} in
              der Sitzung
            </Text>
          </Pressable>
          {!loading && error ? (
            <View style={styles.storyError}>
              <Text style={styles.storyErrorText}>{error}</Text>
            </View>
          ) : null}

          {story?.title ? (
            <>
              <View style={styles.storyPaper}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <View style={styles.storyTitleRule} />
                {story.paragraphs.map((paragraph, index) => (
                  <View key={`${index}-${paragraph.slice(0, 24)}`} style={styles.storyParagraphWrap}>
                    {translationMode ? (
                      <TranslatableParagraph
                        paragraph={paragraph}
                        words={vocabulary}
                        onTranslate={handleTranslate}
                      />
                    ) : (
                      <InteractiveParagraph
                        paragraph={paragraph}
                        words={vocabulary}
                        onPress={handleWordPress}
                      />
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {!loading && error ? (
            <Pressable
              style={[styles.storyGenerateButton, loading && styles.storyGenerateButtonDisabled]}
              onPress={() => createStory(roundWords)}
              disabled={loading}
            >
              <Ionicons name="refresh" size={18} color={colors.misc.text} />
              <Text style={styles.storyGenerateText}>Diese Runde erneut versuchen</Text>
            </Pressable>
          ) : !loading && story && remainingWords.length > 0 ? (
            <Pressable
              style={[styles.storyGenerateButton, loading && styles.storyGenerateButtonDisabled]}
              onPress={continueSession}
              disabled={loading}
            >
              <Ionicons name="sparkles" size={18} color={colors.misc.text} />
              <Text style={styles.storyGenerateText}>
                Weiter mit den nächsten {Math.min(30, remainingWords.length)} Wörtern
              </Text>
            </Pressable>
          ) : !loading && story && usedWords.length === vocabulary.length ? (
            <View style={styles.storySessionComplete}>
              <Ionicons name="checkmark-circle" size={21} color={GOOD.text} />
              <Text style={styles.storySessionCompleteText}>
                Alle {vocabulary.length} Wörter wurden in dieser Sitzung verwendet.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={showSessionWords}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSessionWords(false)}
      >
        <Pressable style={styles.storyModalBackdrop} onPress={() => setShowSessionWords(false)}>
          <Pressable style={styles.storyModalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.wordMeaningHeader}>
              <Text style={styles.storyModalTitle}>Wörter dieser Sitzung</Text>
              <Pressable onPress={() => setShowSessionWords(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.storyModalScroll}>
              <Text style={styles.storyModalSection}>
                Diese Runde ({roundWords.length})
              </Text>
              <Text style={styles.storyModalWords}>
                {roundWords.map((word) => word.wort).join(' · ') || 'Noch keine Wörter'}
              </Text>
              <Text style={styles.storyModalSection}>
                Bisher verwendet ({usedWords.length} von {vocabulary.length})
              </Text>
              <Text style={styles.storyModalWords}>
                {usedWords.map((word) => word.wort).join(' · ') || 'Noch keine Wörter'}
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {activeWord ? (
          <Pressable
            style={styles.wordMeaningOverlay}
            onPress={(event) => event.stopPropagation()}
          >
          <View style={styles.wordMeaningHeader}>
            <Text style={styles.wordMeaningTitle}>
              {activeWord.word.artikel
                ? `${activeWord.word.artikel} ${activeWord.word.wort}`
                : activeWord.word.wort}
            </Text>
            <View style={styles.wordMeaningActions}>
              <ReadAloudButton
                text={
                  activeWord.word.artikel
                    ? `${activeWord.word.artikel} ${activeWord.word.wort}`
                    : activeWord.word.wort
                }
                language="de-DE"
                compact
              />
              {activeWord.pinned ? (
                <Pressable
                  onPress={() => {
                    wordMeaningRequest.current += 1;
                    setActiveWord(null);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
          {activeWord.loading ? (
            <View style={styles.translationLoading}>
              <ActivityIndicator size="small" color={colors.misc.text} />
              <Text style={styles.translationLoadingText}>Bedeutung wird geladen…</Text>
            </View>
          ) : activeWord.error ? (
            <Text style={styles.translationError}>{activeWord.error}</Text>
          ) : (
            <Text style={styles.wordMeaningText}>{activeWord.word.bedeutung}</Text>
          )}
          {activeWord.word.notizen ? (
            <Text style={styles.wordMeaningNotes} numberOfLines={3}>
              {activeWord.word.notizen}
            </Text>
          ) : null}
          </Pressable>
      ) : null}

      {translation ? (
        <View style={styles.wordMeaningOverlay}>
          <View style={styles.wordMeaningHeader}>
            <Text style={styles.translationOverlayLabel}>DE → EN</Text>
            <View style={styles.wordMeaningActions}>
              <ReadAloudButton
                text={translation.source}
                language="de-DE"
                compact
              />
              <Pressable
                onPress={() => {
                  translationRequest.current += 1;
                  setTranslation(null);
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.translationSource} numberOfLines={3}>
            {translation.source}
          </Text>
          {translation.loading ? (
            <View style={styles.translationLoading}>
              <ActivityIndicator size="small" color={colors.misc.text} />
              <Text style={styles.translationLoadingText}>Wird übersetzt…</Text>
            </View>
          ) : (
            <Text style={translation.error ? styles.translationError : styles.wordMeaningText}>
              {translation.error || translation.text}
            </Text>
          )}
        </View>
      ) : null}
    </Pressable>
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

function normalizeAnswer(value) {
  return value
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/^(der|die|das)\s+/, '')
    .replace(/[.!?,;:]/g, '');
}

function WordQuest({ words, onExit }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const vocabulary = useMemo(
    () => words.filter((word) => word.wort && word.bedeutung),
    [words],
  );
  const [queue, setQueue] = useState(() => shuffle(vocabulary));
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [hint, setHint] = useState(false);

  const current = queue[0];
  const target = current?.wort ?? '';
  const targetWithoutArticle = normalizeAnswer(target);

  if (!current && completed === 0) {
    return (
      <EmptyState
        message="Du brauchst mindestens ein gespeichertes Wort mit Bedeutung für Word Quest."
        onExit={onExit}
      />
    );
  }

  const checkAnswer = () => {
    if (!answer.trim() || result) return;
    const correct = normalizeAnswer(answer) === targetWithoutArticle;
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((best) => Math.max(best, nextStreak));
      setXp((value) => value + (hint ? 5 : 10) + Math.min(nextStreak * 2, 10));
    } else {
      setStreak(0);
      setMistakes((value) => value + 1);
    }
  };

  const nextWord = () => {
    const rest = queue.slice(1);
    // Missed words return quickly. Correct words go to the back of the queue,
    // so the session continues until the player chooses to leave.
    if (result === 'wrong') {
      const insertAt = Math.min(2, rest.length);
      rest.splice(insertAt, 0, current);
    } else {
      setCompleted((value) => value + 1);
      rest.push(current);
    }
    setQueue(rest);
    setAnswer('');
    setResult(null);
    setHint(false);
  };

  const displayedWord = current.artikel
    ? `${current.artikel} ${current.wort}`
    : current.wort;

  return (
    <View style={styles.gameArea}>
      <View style={styles.scoreRow}>
        <Pressable onPress={onExit} hitSlop={8} style={styles.exitButton}>
          <Ionicons name="chevron-back" size={20} color={colors.textDark} />
          <Text style={styles.exitText}>Spiele</Text>
        </Pressable>
        <View style={styles.questStats}>
          <Text style={styles.questStat}>🔥 {streak}</Text>
          <Text style={styles.questStat}>⚡ {xp} XP</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.gameBody}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.questionLabel}>Runde {completed + mistakes + 1} · Endlosmodus</Text>
        <View style={styles.questPromptCard}>
          <Text style={styles.questPromptLabel}>Wie heißt dieses Wort auf Deutsch?</Text>
          <Text style={styles.questMeaning}>{current.bedeutung}</Text>
          {hint ? (
            <Text style={styles.questHint}>
              Hinweis: {targetWithoutArticle.charAt(0).toLocaleUpperCase('de-DE')}
              {' •'.repeat(Math.max(targetWithoutArticle.length - 1, 0))}
              {current.artikel ? ` · Artikel: ${current.artikel}` : ''}
            </Text>
          ) : null}
        </View>

        <TextInput
          value={answer}
          onChangeText={setAnswer}
          onSubmitEditing={checkAnswer}
          editable={!result}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Deine Antwort …"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Deine Antwort"
          style={[
            styles.questInput,
            result === 'correct' && styles.questInputCorrect,
            result === 'wrong' && styles.questInputWrong,
          ]}
        />

        {result ? (
          <View
            style={[
              styles.questFeedback,
              { backgroundColor: result === 'correct' ? GOOD.bg : BAD.bg },
            ]}
          >
            <Ionicons
              name={result === 'correct' ? 'checkmark-circle' : 'refresh-circle'}
              size={22}
              color={result === 'correct' ? GOOD.text : BAD.text}
            />
            <Text
              style={[
                styles.questFeedbackText,
                { color: result === 'correct' ? GOOD.text : BAD.text },
              ]}
            >
              {result === 'correct'
                ? `Richtig! +${(hint ? 5 : 10) + Math.min(streak * 2, 10)} XP`
                : `Fast! Richtig ist „${displayedWord}“. Das Wort kommt gleich noch einmal.`}
            </Text>
          </View>
        ) : (
          <Pressable style={styles.questHintButton} onPress={() => setHint(true)}>
            <Ionicons name="bulb-outline" size={18} color={colors.textMuted} />
            <Text style={styles.questHintButtonText}>
              {hint ? 'Hinweis eingeblendet' : 'Hinweis (-5 XP)'}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.nextButton, !answer.trim() && !result && styles.buttonDisabled]}
          onPress={result ? nextWord : checkAnswer}
          disabled={!answer.trim() && !result}
        >
          <Text style={styles.nextButtonText}>{result ? 'Weiter' : 'Antwort prüfen'}</Text>
        </Pressable>
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
  if (game === 'story') return <StoryActivity words={words} onExit={() => setGame(null)} />;
  if (game === 'quest') return <WordQuest words={words} onExit={() => setGame(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.menu}>
      <Pressable style={[styles.menuCard, styles.questMenuCard]} onPress={() => setGame('quest')}>
        <View style={styles.questMenuIcon}>
          <Ionicons name="flash" size={26} color="#6b4600" />
        </View>
        <View style={styles.menuTextWrap}>
          <View style={styles.questTitleRow}>
            <Text style={styles.menuTitle}>Word Quest</Text>
            <Text style={styles.newBadge}>NEU</Text>
          </View>
          <Text style={styles.menuSubtitle}>
            Erinnere dich aktiv, sammle XP und wiederhole schwierige Wörter.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

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

      <Pressable style={styles.menuCard} onPress={() => setGame('story')}>
        <View style={[styles.menuIcon, { backgroundColor: colors.die.bg }]}>
          <Ionicons name="book" size={26} color={colors.die.text} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>Meine Geschichte</Text>
          <Text style={styles.menuSubtitle}>
            KI schreibt eine Geschichte mit all deinen gespeicherten Wörtern.
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
  questMenuCard: {
    borderColor: '#d6a72c',
    borderWidth: 1.5,
  },
  questMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe9a8',
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBadge: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ffe9a8',
    color: '#6b4600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '900',
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
  questStats: {
    flexDirection: 'row',
    gap: 12,
  },
  questStat: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },
  questProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#d6a72c',
  },
  questPromptCard: {
    backgroundColor: colors.headerBg,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  questPromptLabel: {
    color: '#cfc9bd',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  questMeaning: {
    color: '#fff',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  questHint: {
    marginTop: 16,
    color: '#ffe9a8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  questInput: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    color: colors.textDark,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
  },
  questInputCorrect: {
    borderColor: GOOD.border,
  },
  questInputWrong: {
    borderColor: BAD.border,
  },
  questHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  questHintButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  questFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
  },
  questFeedbackText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  questComplete: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  questTrophy: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe9a8',
    marginBottom: 18,
  },
  questCompleteTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: '900',
  },
  questCompleteSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  questSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 24,
  },
  questSummaryCard: {
    minWidth: 120,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  questSummaryValue: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: '900',
  },
  questSummaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
  storyBody: {
    paddingTop: 8,
    paddingBottom: 150,
  },
  storyLevelScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 52,
  },
  storyLevelTitle: {
    marginTop: 12,
    color: colors.textDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  storyLevelIntro: {
    maxWidth: 440,
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  storyLevelOptions: {
    width: '100%',
    maxWidth: 520,
    gap: 11,
    marginTop: 26,
  },
  storyLevelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.cardBg,
  },
  storyLevelOptionPressed: {
    opacity: 0.72,
  },
  storyLevelBadge: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.misc.bg,
  },
  storyLevelBadgeText: {
    color: colors.misc.text,
    fontSize: 16,
    fontWeight: '900',
  },
  storyLevelCopy: {
    flex: 1,
  },
  storyLevelOptionTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
  storyLevelDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  storyResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  storyResetText: {
    color: colors.misc.text,
    fontSize: 12,
    fontWeight: '800',
  },
  storyProgressLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
    paddingVertical: 7,
  },
  storyProgressLinkText: {
    color: colors.misc.text,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  storyLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  storyLoadingText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  storyError: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.die.text,
    borderRadius: 10,
    backgroundColor: colors.die.bg,
  },
  storyErrorText: {
    color: colors.die.text,
    fontSize: 14,
    lineHeight: 20,
  },
  storyPaper: {
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
    elevation: 4,
  },
  storyTitle: {
    color: colors.textDark,
    fontFamily: 'Georgia',
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyTitleRule: {
    alignSelf: 'center',
    width: 54,
    height: 2,
    marginTop: 14,
    marginBottom: 22,
    backgroundColor: colors.misc.text,
  },
  storyParagraphWrap: {
    marginBottom: 18,
  },
  storyParagraph: {
    color: colors.textDark,
    fontSize: 17,
    lineHeight: 28,
  },
  storyClickableWord: {
    color: colors.textDark,
  },
  storyInteractiveWord: {
    color: colors.misc.text,
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  storyTranslatableSentence: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: colors.misc.text,
  },
  storySelectedText: {
    color: colors.textDark,
    backgroundColor: colors.misc.bg,
    fontWeight: '800',
    textDecorationLine: 'none',
  },
  storyTranslateToggle: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 7,
    paddingLeft: 4,
  },
  storyStickyControls: {
    zIndex: 2,
    paddingTop: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  storyTranslateToggleActive: {
    opacity: 1,
  },
  storyTranslateToggleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  storyTranslateToggleTextActive: {
    color: colors.misc.text,
  },
  storyTranslateSwitchTrack: {
    width: 44,
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 13,
    backgroundColor: colors.border,
  },
  storyTranslateSwitchTrackActive: {
    backgroundColor: colors.misc.text,
  },
  storyTranslateSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  storyTranslateSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  storyTranslateHint: {
    marginTop: -2,
    marginBottom: 12,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
  },
  storyGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.misc.text,
    borderRadius: 10,
    backgroundColor: colors.misc.bg,
  },
  storyGenerateButtonDisabled: {
    opacity: 0.6,
  },
  storyGenerateText: {
    color: colors.misc.text,
    fontSize: 15,
    fontWeight: '800',
  },
  storySessionComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    backgroundColor: GOOD.bg,
  },
  storySessionCompleteText: {
    flex: 1,
    color: GOOD.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  storyModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  storyModalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '78%',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
  },
  storyModalTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '800',
  },
  storyModalScroll: {
    marginTop: 8,
  },
  storyModalSection: {
    marginTop: 16,
    marginBottom: 7,
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '800',
  },
  storyModalWords: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  wordMeaningOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 14,
    zIndex: 50,
    elevation: 10,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.misc.text,
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  wordMeaningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordMeaningActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordMeaningTitle: {
    color: colors.misc.text,
    fontSize: 18,
    fontWeight: '900',
  },
  wordMeaningText: {
    marginTop: 4,
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '700',
  },
  wordMeaningNotes: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  translationOverlayLabel: {
    color: colors.misc.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  translationSource: {
    marginTop: 7,
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  translationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  translationLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  translationError: {
    marginTop: 6,
    color: colors.die.text,
    fontSize: 14,
    fontWeight: '700',
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
