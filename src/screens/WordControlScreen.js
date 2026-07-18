import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, articles, selectableArticles } from '../theme/colors';
import { addWord, autofillWord, deleteWord, getWords } from '../services/wordsService';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function articleStyle(article) {
  return colors[article] ?? colors.misc;
}

function bucketFor(article) {
  return articles.includes(article) ? article : 'misc';
}

function AlphabetIndex({ letters, onSelect }) {
  if (letters.length === 0) return null;

  return (
    <View style={styles.alphabetIndex}>
      {letters.map((letter) => (
        <Pressable key={letter} onPress={() => onSelect(letter)} hitSlop={4}>
          <Text style={styles.alphabetIndexLetter}>{letter}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function WordControlScreen() {
  const [mode, setMode] = useState('list');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Alle');
  const [detailWord, setDetailWord] = useState(null);

  const [artikel, setArtikel] = useState('');
  const [wort, setWort] = useState('');
  const [bedeutung, setBedeutung] = useState('');
  const [notizen, setNotizen] = useState('');
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getWords();
      setWords(fetched);
    } catch (err) {
      Alert.alert('Fehler', err.message ?? 'Failed to load words.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base = { Alle: words.length, der: 0, die: 0, das: 0, misc: 0 };
    words.forEach((w) => {
      base[bucketFor(w.artikel)] += 1;
    });
    return base;
  }, [words]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return words
      .filter((w) => {
        const matchesFilter = filter === 'Alle' || bucketFor(w.artikel) === filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        return (
          w.wort?.toLowerCase().includes(query) ||
          w.bedeutung?.toLowerCase().includes(query) ||
          w.notizen?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.wort ?? '').localeCompare(b.wort ?? '', 'de', { sensitivity: 'base' }));
  }, [words, filter, search]);

  const sections = useMemo(() => {
    const map = new Map();
    filteredWords.forEach((w) => {
      const letter = (w.wort ?? '').trim().charAt(0).toUpperCase() || '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(w);
    });
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredWords]);

  const listScrollRef = useRef(null);
  const sectionOffsets = useRef({});

  const jumpToLetter = useCallback((letter) => {
    const y = sectionOffsets.current[letter];
    if (y === undefined) return;
    listScrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);

  const wortMatches = useMemo(() => {
    const query = wort.trim().toLowerCase();
    if (!query) return [];
    return words.filter((w) => w.wort?.toLowerCase().includes(query)).slice(0, 4);
  }, [words, wort]);

  const canSave = wort.trim() !== '' && bedeutung.trim() !== '';

  const resetForm = () => {
    setArtikel('');
    setWort('');
    setBedeutung('');
    setNotizen('');
  };

  const handleAutofill = async () => {
    if (wort.trim() === '' || filling) return;
    setFilling(true);
    try {
      const suggestion = await autofillWord({ wort: wort.trim(), artikel });
      if (!artikel && suggestion.artikel) setArtikel(suggestion.artikel);
      if (suggestion.bedeutung) setBedeutung(suggestion.bedeutung);
      if (suggestion.notizen) setNotizen(suggestion.notizen);
    } catch (err) {
      const msg =
        err.response?.data?.error ?? err.message ?? 'Could not autofill this word.';
      Alert.alert('Autofill fehlgeschlagen', msg);
    } finally {
      setFilling(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addWord({
        artikel,
        wort: wort.trim(),
        bedeutung: bedeutung.trim(),
        notizen: notizen.trim(),
      });
      resetForm();
      await load();
      // Stay on the "Neues Wort" tab with a cleared form, ready for the next word.
    } catch (err) {
      Alert.alert('Fehler', err.message ?? 'Failed to save word.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, onDeleted) => {
    Alert.alert('Wort löschen?', 'This word will be removed.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWord(id);
            await load();
            onDeleted?.();
          } catch (err) {
            Alert.alert('Fehler', err.message ?? 'Failed to delete word.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Mein </Text>
          <Text style={styles.titleItalic}>Wörterbuch</Text>
        </Text>
        <Text style={styles.subtitle}>
          <Text style={{ color: colors.der.text }}>der</Text>
          <Text style={styles.dot}> · </Text>
          <Text style={{ color: colors.die.text }}>die</Text>
          <Text style={styles.dot}> · </Text>
          <Text style={{ color: colors.das.text }}>das</Text>
          <Text style={styles.dot}> · </Text>
          <Text style={{ color: colors.misc.text }}>misc</Text>
        </Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, mode === 'add' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setMode('add')}
        >
          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'add' && styles.tabButtonTextActive]}
          >
            + Neues Wort
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, mode === 'list' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setMode('list')}
        >
          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'list' && styles.tabButtonTextActive]}
          >
            Wörterbuch <Text style={styles.tabBadge}>{words.length}</Text>
          </Text>
        </Pressable>
      </View>

      {mode === 'add' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.formRow}>
              <View style={{ flex: 0.35, marginRight: 12 }}>
                <Text style={styles.label}>ARTIKEL</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={artikel}
                    onValueChange={setArtikel}
                    style={styles.picker}
                    dropdownIconColor={colors.misc.text}
                  >
                    <Picker.Item label="—" value="" />
                    {selectableArticles.map((a) => (
                      <Picker.Item key={a} label={a} value={a} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 0.65 }}>
                <Text style={styles.label}>WORT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="z.B. Haus"
                  placeholderTextColor={colors.placeholder}
                  value={wort}
                  onChangeText={setWort}
                />
              </View>
            </View>

            <Pressable
              style={[styles.autofillButton, (wort.trim() === '' || filling) && styles.autofillButtonDisabled]}
              onPress={handleAutofill}
              disabled={wort.trim() === '' || filling}
            >
              <Ionicons name="sparkles" size={15} color={colors.misc.text} />
              <Text style={styles.autofillButtonText}>
                {filling ? 'Fülle aus…' : 'Auto-fill mit KI'}
              </Text>
            </Pressable>

            {wortMatches.length > 0 ? (
              <View style={styles.matchPanel}>
                <Text style={styles.matchPanelTitle}>
                  {wortMatches.length === 1 ? 'Schon vorhanden:' : `${wortMatches.length} ähnliche Wörter:`}
                </Text>
                {wortMatches.map((w) => (
                  <View key={w.id ?? w._id} style={styles.matchRow}>
                    <Text style={[styles.matchArtikel, { color: articleStyle(bucketFor(w.artikel)).text }]}>
                      {w.artikel || '—'}
                    </Text>
                    <Text style={styles.matchWort} numberOfLines={1}>
                      {w.wort}
                    </Text>
                    <Text style={styles.matchBedeutung} numberOfLines={1}>
                      {w.bedeutung}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.label}>BEDEUTUNG / MEANING *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. house"
              placeholderTextColor={colors.placeholder}
              value={bedeutung}
              onChangeText={setBedeutung}
            />

            <Text style={styles.label}>NOTIZEN / NOTES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Plural, example sentence, memory trick..."
              placeholderTextColor={colors.placeholder}
              value={notizen}
              onChangeText={setNotizen}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={[styles.saveButton, canSave ? styles.saveButtonActive : styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Speichern…' : 'Wort speichern'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <TextInput
            style={styles.searchInput}
            placeholder="Wort suchen…  (word, meaning or notes)"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ paddingRight: 12 }}
          >
            {['Alle', ...articles].map((key) => {
              const active = filter === key;
              const style = key === 'Alle' ? null : articleStyle(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[
                    styles.filterPill,
                    active
                      ? { backgroundColor: colors.activePill }
                      : { backgroundColor: style ? style.bg : '#efe9db' },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active ? { color: '#fff' } : { color: style ? style.text : colors.textDark },
                    ]}
                  >
                    {key} <Text style={styles.filterCount}>{counts[key] ?? 0}</Text>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <Text style={styles.emptyText}>Lädt…</Text>
          ) : filteredWords.length === 0 ? (
            <Text style={styles.emptyText}>
              {words.length === 0
                ? 'Noch keine Wörter. Füge dein erstes Wort im Tab „Neues Wort" hinzu!'
                : 'Keine Treffer.'}
            </Text>
          ) : (
            <View style={styles.listArea}>
              <ScrollView ref={listScrollRef} style={styles.sectionList} contentContainerStyle={{ paddingBottom: 20 }}>
                {sections.map((section) => (
                  <Fragment key={section.title}>
                    <View
                      style={styles.sectionHeader}
                      onLayout={(e) => {
                        sectionOffsets.current[section.title] = e.nativeEvent.layout.y;
                      }}
                    >
                      <View style={styles.sectionHeaderLine} />
                      <Text style={styles.sectionHeaderText}>{section.title}</Text>
                      <View style={styles.sectionHeaderLine} />
                    </View>
                    {section.data.map((item) => {
                      const bucket = bucketFor(item.artikel);
                      const style = articleStyle(bucket);
                      return (
                        <Pressable
                          key={item.id ?? item._id}
                          style={styles.wordCard}
                          onPress={() => setDetailWord(item)}
                        >
                          <Text style={styles.wordLine} numberOfLines={1}>
                            <Text style={[styles.wordText, bucket !== 'misc' && { color: style.text }]}>
                              {item.artikel ? `${item.artikel} ${item.wort}` : item.wort}
                            </Text>
                            <Text style={styles.pipeText}> | </Text>
                            <Text style={styles.meaningText}>{item.bedeutung}</Text>
                          </Text>
                        </Pressable>
                      );
                    })}
                  </Fragment>
                ))}
              </ScrollView>
              <AlphabetIndex letters={sections.map((s) => s.title)} onSelect={jumpToLetter} />
            </View>
          )}
        </View>
      )}

      <Modal
        visible={!!detailWord}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailWord(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetailWord(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {detailWord ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text
                    style={[
                      styles.modalWord,
                      bucketFor(detailWord.artikel) !== 'misc' && {
                        color: articleStyle(bucketFor(detailWord.artikel)).text,
                      },
                    ]}
                  >
                    {detailWord.artikel ? `${detailWord.artikel} ${detailWord.wort}` : detailWord.wort}
                  </Text>
                  <Pressable
                    onPress={() =>
                      handleDelete(detailWord.id ?? detailWord._id, () => setDetailWord(null))
                    }
                    hitSlop={10}
                    style={{ marginLeft: 20 }}
                  >
                    <Ionicons name="trash" size={22} color={colors.die.text} />
                  </Pressable>
                </View>
                <Text style={styles.modalMeaning}>{detailWord.bedeutung}</Text>
                {detailWord.notizen ? (
                  <View style={styles.modalNotesBlock}>
                    <Text style={styles.modalNotesLabel}>NOTIZEN</Text>
                    <Text style={styles.modalNotesText}>{detailWord.notizen}</Text>
                  </View>
                ) : null}
                <Pressable style={styles.modalCloseButton} onPress={() => setDetailWord(null)}>
                  <Text style={styles.modalCloseButtonText}>Schließen</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 30,
  },
  titleBold: {
    fontFamily: titleFont,
    fontWeight: '700',
    color: '#fff',
  },
  titleItalic: {
    fontFamily: titleFont,
    fontStyle: 'italic',
    color: '#fff',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    color: '#7a7468',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  tabButtonActive: {
    backgroundColor: colors.headerBg,
    borderColor: colors.headerBg,
  },
  tabButtonInactive: {
    backgroundColor: colors.cardBg,
    borderColor: colors.border,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  tabBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
  },
  filterRow: {
    marginTop: 14,
    flexGrow: 0,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterCount: {
    fontWeight: '400',
    opacity: 0.7,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: 20,
  },
  listArea: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 16,
  },
  sectionList: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.pageBg,
  },
  sectionHeaderLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  sectionHeaderText: {
    marginHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  alphabetIndex: {
    width: 20,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  alphabetIndexLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.misc.text,
    textAlign: 'center',
  },
  wordCard: {
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  wordLine: {
    fontSize: 16,
  },
  wordText: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textDark,
  },
  pipeText: {
    color: colors.textDark,
    fontWeight: '900',
  },
  meaningText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalWord: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textDark,
  },
  modalMeaning: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textMuted,
  },
  modalNotesBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  modalNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
  },
  modalNotesText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: colors.headerBg,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.misc.text,
    backgroundColor: colors.misc.bg,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    color: colors.misc.text,
  },
  input: {
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonActive: {
    backgroundColor: colors.headerBg,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabledButton,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  autofillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.misc.bg,
    borderWidth: 1,
    borderColor: colors.misc.text,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 16,
  },
  autofillButtonDisabled: {
    opacity: 0.5,
  },
  autofillButtonText: {
    color: colors.misc.text,
    fontSize: 14,
    fontWeight: '700',
  },
  matchPanel: {
    backgroundColor: colors.misc.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  matchPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.misc.text,
    marginBottom: 6,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  matchArtikel: {
    fontSize: 13,
    fontWeight: '700',
    width: 32,
  },
  matchWort: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    flex: 0.4,
  },
  matchBedeutung: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 0.6,
  },
});
