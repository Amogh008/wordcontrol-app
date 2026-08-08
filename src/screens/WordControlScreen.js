import { localize } from "../locales";import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { HazyPicker } from '../components/HazySelect';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { addWord, autofillWord, deleteWord, getWords, updateWord } from '../services/wordsService';
import OutlinedButton from '../components/OutlinedButton';
import ReadAloudButton from '../components/ReadAloudButton';
import { useLanguageProfile } from '../context/LanguageProfileContext';
import { languageByCode } from '../languages';
import { useAppDialog } from '../context/AppDialogContext';
import NestedConfirmDialog from '../components/NestedConfirmDialog';
import PopIn from '../components/PopIn';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function articleStyle(colors, article, profileArticles) {
  if (article === 'misc') return colors.misc;
  const index = profileArticles.indexOf(article);
  const dark = colors.pageBg === '#121110';
  const palette = [
  colors.der,
  colors.die,
  colors.das,
  dark ? { text: '#ffb86b', bg: '#402d1d' } : { text: '#d9480f', bg: '#ffe8cc' },
  dark ? { text: '#63e6be', bg: '#163b34' } : { text: '#087f5b', bg: '#c3fae8' },
  dark ? { text: '#e599f7', bg: '#3b2442' } : { text: '#9c36b5', bg: '#f3d9fa' }];

  return palette[index] || colors.misc;
}

function AlphabetIndex({ letters, onSelect }) {
  const { colors } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (letters.length === 0) return null;

  return (
    <View style={styles.alphabetIndex}>
      {letters.map((letter) =>
      <Pressable key={letter} onPress={() => onSelect(letter)} hitSlop={4}>
          <Text style={styles.alphabetIndexLetter}>{letter}</Text>
        </Pressable>
      )}
    </View>);

}

export default function WordControlScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const { activeProfile } = useLanguageProfile();
  const profileArticles = languageByCode(activeProfile?.language)?.articles || [];
  const bucketFor = useCallback((article) => profileArticles.includes(article) ? article : 'misc', [profileArticles]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState('list');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Alle');
  const [detailWord, setDetailWord] = useState(null);
  const [confirmingWordDelete, setConfirmingWordDelete] = useState(false);
  const [deletingWord, setDeletingWord] = useState(false);
  const [wordDeleteError, setWordDeleteError] = useState('');

  const [artikel, setArtikel] = useState('');
  const [wort, setWort] = useState('');
  const [bedeutung, setBedeutung] = useState('');
  const [notizen, setNotizen] = useState('');
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast('');
      toastTimerRef.current = null;
    }, 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getWords();
      setWords(fetched);
    } catch (err) {
      dialog.alert(localize('Error'), err.message ?? 'Failed to load words.');
    } finally {
      setLoading(false);
    }
  }, [isDe]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const counts = useMemo(() => {
    const base = { Alle: words.length, misc: 0 };
    profileArticles.forEach((item) => {base[item] = 0;});
    words.forEach((w) => {
      base[bucketFor(w.artikel)] += 1;
    });
    return base;
  }, [words, profileArticles, bucketFor]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return words.
    filter((w) => {
      const matchesFilter = filter === 'Alle' || bucketFor(w.artikel) === filter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return (
        w.wort?.toLowerCase().includes(query) ||
        w.bedeutung?.toLowerCase().includes(query) ||
        w.notizen?.toLowerCase().includes(query));

    }).
    sort((a, b) => (a.wort ?? '').localeCompare(b.wort ?? '', 'de', { sensitivity: 'base' }));
  }, [words, filter, search, bucketFor]);

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
    setEditingId(null);
  };

  const handleAutofill = async () => {
    if (wort.trim() === '' || filling) return;
    setFilling(true);
    try {
      const currentWort = wort.trim();
      const currentArtikel = artikel;
      const suggestion = await autofillWord({ wort: currentWort, artikel: currentArtikel });
      const corrections = [];
      const correctedWort = suggestion.wort?.trim();

      if (correctedWort && correctedWort !== currentWort) {
        setWort(correctedWort);
        corrections.push(`Rechtschreibung: „${currentWort}“ → „${correctedWort}“`);
      }

      if (suggestion.artikel === '' || profileArticles.includes(suggestion.artikel)) {
        setArtikel(suggestion.artikel);
        if (currentArtikel && suggestion.artikel !== currentArtikel) {
          corrections.push(
            `Artikel: „${currentArtikel}“ → „${suggestion.artikel || 'kein Artikel'}“`
          );
        }
      }
      if (suggestion.bedeutung) setBedeutung(suggestion.bedeutung);
      if (suggestion.notizen) setNotizen(suggestion.notizen);
      if (corrections.length > 0) showToast(corrections.join('\n'));
    } catch (err) {
      const msg =
      err.response?.data?.error ?? err.message ?? 'Could not autofill this word.';
      dialog.alert(localize('Autofill failed'), msg);
    } finally {
      setFilling(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        artikel,
        wort: wort.trim(),
        bedeutung: bedeutung.trim(),
        notizen: notizen.trim()
      };
      if (editingId) {
        await updateWord(editingId, payload);
        resetForm();
        await load();
        setMode('list');
      } else {
        await addWord(payload);
        resetForm();
        await load();
        // Stay on the "Neues Wort" tab with a cleared form, ready for the next word.
      }
    } catch (err) {
      dialog.alert(localize('Error'), err.message ?? 'Failed to save word.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (word) => {
    setEditingId(word.id ?? word._id);
    setArtikel(word.artikel ?? '');
    setWort(word.wort ?? '');
    setBedeutung(word.bedeutung ?? '');
    setNotizen(word.notizen ?? '');
    setDetailWord(null);
    setMode('add');
  };

  const handleDelete = async (id) => {
    setDeletingWord(true);
    try {
      await deleteWord(id);
      await load();
      setConfirmingWordDelete(false);
      setDetailWord(null);
    } catch (err) {
      setWordDeleteError(err.message ?? 'Failed to delete word.');
    } finally {
      setDeletingWord(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize('Vocabulary')}</Text>
        </Text>
        {profileArticles.length ? <Text style={styles.subtitle}>
          {profileArticles.map((item, index) =>
          <Text key={item}>
              {index ? <Text style={styles.dot}>{localize("\xB7")}</Text> : null}
              <Text style={{ color: articleStyle(colors, item, profileArticles).text }}>{item}</Text>
            </Text>
          )}
          {profileArticles.length ? <Text style={styles.dot}>{localize("\xB7")}</Text> : null}
          <Text style={{ color: colors.misc.text }}>{localize("misc")}</Text>
        </Text> : null}
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, mode === 'add' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setMode('add')}>

          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'add' && styles.tabButtonTextActive]}>

            {editingId ? localize('Edit word') : localize('+ New word')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, mode === 'list' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => {
            if (editingId) resetForm();
            setMode('list');
          }}>

          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'list' && styles.tabButtonTextActive]}>

            {localize('Vocabulary')} <Text style={styles.tabBadge}>{words.length}</Text>
          </Text>
        </Pressable>
      </View>

      {mode === 'add' ?
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.actionRow}>
              <OutlinedButton
              title={saving ? localize('Saving…') : editingId ? localize('Save changes') : localize('Save word')}
              icon="save"
              tone="success"
              onPress={handleSave}
              disabled={!canSave || saving}
              loading={saving}
              style={styles.saveButton} />


              <Pressable style={styles.clearButton} onPress={resetForm}>
                <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
                <Text style={styles.clearButtonText}>{localize('Clear all')}</Text>
              </Pressable>
            </View>

            <View style={styles.formRow}>
              {profileArticles.length ? <View style={{ flex: 0.35, marginRight: 12 }}>
                <Text style={styles.label}>{localize('ARTICLE')}</Text>
                <HazyPicker containerStyle={styles.pickerWrap}
                  selectedValue={artikel}
                  onValueChange={setArtikel}
                  pickerStyle={styles.picker}
                  dropdownIconColor={colors.misc.text}>

                    <Picker.Item label="—" value="" />
                    {profileArticles.map((a) =>
                  <Picker.Item key={a} label={a} value={a} />
                  )}
                </HazyPicker>
              </View> : null}
              <View style={{ flex: profileArticles.length ? 0.65 : 1 }}>
                <Text style={styles.label}>{localize('WORD *')}</Text>
                <TextInput
                style={styles.input}
                placeholder={localize("z.B. Haus")}
                placeholderTextColor={colors.placeholder}
                value={wort}
                onChangeText={setWort} />

              </View>
            </View>

            <Pressable
            style={[styles.autofillButton, (wort.trim() === '' || filling) && styles.autofillButtonDisabled]}
            onPress={handleAutofill}
            disabled={wort.trim() === '' || filling}>

              <Ionicons name="sparkles" size={15} color={colors.misc.text} />
              <Text style={styles.autofillButtonText}>
                {filling ? localize('Filling…') : localize('AI autofill')}
              </Text>
            </Pressable>

            {wortMatches.length > 0 ?
          <View style={styles.matchPanel}>
                <Text style={styles.matchPanelTitle}>
                  {wortMatches.length === 1 ? localize('Already saved:') : `${wortMatches.length} ${localize('similar words:')}`}
                </Text>
                {wortMatches.map((w) =>
            <View key={w.id ?? w._id} style={styles.matchRow}>
                    {profileArticles.includes(w.artikel) ?
              <Text style={[styles.matchArtikel, { color: articleStyle(colors, w.artikel, profileArticles).text }]}>{w.artikel}</Text> :
              null}
                    <Text style={styles.matchWort} numberOfLines={1}>
                      {w.wort}
                    </Text>
                    <Text style={styles.matchBedeutung} numberOfLines={1}>
                      {w.bedeutung}
                    </Text>
                  </View>
            )}
              </View> :
          null}

            <Text style={styles.label}>{localize('MEANING *')}</Text>
            <TextInput
            style={styles.input}
            placeholder={localize("e.g. house")}
            placeholderTextColor={colors.placeholder}
            value={bedeutung}
            onChangeText={setBedeutung} />


            <Text style={styles.label}>{localize('NOTES')}</Text>
            <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={localize("Plural, example sentence, memory trick...")}
            placeholderTextColor={colors.placeholder}
            value={notizen}
            onChangeText={setNotizen}
            multiline
            numberOfLines={4} />

          </View>
        </ScrollView> :

      <View style={styles.body}>
          <TextInput
          style={styles.searchInput}
          placeholder={localize('Search words… (word, meaning or notes)')}
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch} />


          {profileArticles.length ? <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingRight: 12 }}>

            {['Alle', ...profileArticles, 'misc'].map((key) => {
            const active = filter === key;
            const style = key === 'Alle' ? null : articleStyle(colors, key, profileArticles);
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[
                styles.filterPill,
                active ?
                { backgroundColor: colors.activePill } :
                { backgroundColor: style ? style.bg : colors.border }]
                }>

                  <Text
                  style={[
                  styles.filterPillText,
                  active ? { color: '#fff' } : { color: style ? style.text : colors.textDark }]
                  }>

                    {key === 'Alle' ? localize('All') : key} <Text style={styles.filterCount}>{counts[key] ?? 0}</Text>
                  </Text>
                </Pressable>);

          })}
          </ScrollView> : null}

          {loading ?
        <Text style={styles.emptyText}>{localize('Loading…')}</Text> :
        filteredWords.length === 0 ?
        <Text style={styles.emptyText}>
              {words.length === 0 ? localize(
            'No words yet. Add your first one in the “New word” tab!') : localize(
            'No matches.')}
            </Text> :

        <View style={styles.listArea}>
              <ScrollView ref={listScrollRef} style={styles.sectionList} contentContainerStyle={{ paddingBottom: 20 }}>
                {sections.map((section) =>
            <Fragment key={section.title}>
                    <View
                style={styles.sectionHeader}
                onLayout={(e) => {
                  sectionOffsets.current[section.title] = e.nativeEvent.layout.y;
                }}>

                      <View style={styles.sectionHeaderLine} />
                      <Text style={styles.sectionHeaderText}>{section.title}</Text>
                      <View style={styles.sectionHeaderLine} />
                    </View>
                    {section.data.map((item) => {
                const bucket = bucketFor(item.artikel);
                const style = articleStyle(colors, bucket, profileArticles);
                return (
                  <Pressable
                    key={item.id ?? item._id}
                    style={styles.wordCard}
                    onPress={() => setDetailWord(item)}>

                          <Text style={styles.wordLine} numberOfLines={1}>
                            <Text style={[styles.wordText, bucket !== 'misc' && { color: style.text }]}>
                              {profileArticles.includes(item.artikel) ? `${item.artikel} ${item.wort}` : item.wort}
                            </Text>
                            <Text style={styles.pipeText}>{'  |  '}</Text>
                            <Text style={styles.meaningText}>{item.bedeutung}</Text>
                          </Text>
                        </Pressable>);

              })}
                  </Fragment>
            )}
              </ScrollView>
              <AlphabetIndex letters={sections.map((s) => s.title)} onSelect={jumpToLetter} />
            </View>
        }
        </View>
      }

      {toast ?
      <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
        </View> :
      null}

      <Modal
        visible={!!detailWord}
        transparent
        animationType="fade"
        onRequestClose={() => confirmingWordDelete ? setConfirmingWordDelete(false) : setDetailWord(null)}>

        <Pressable style={styles.modalOverlay} onPress={() => {}}>
          <PopIn visible={!!detailWord} style={styles.modalPopInWrap}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {detailWord ?
            <>
                <View style={styles.modalHeaderRow}>
                  <Text
                  style={[
                  styles.modalWord,
                  bucketFor(detailWord.artikel) !== 'misc' && {
                    color: articleStyle(colors, bucketFor(detailWord.artikel), profileArticles).text
                  }]
                  }>

                    {profileArticles.includes(detailWord.artikel) ? `${detailWord.artikel} ${detailWord.wort}` : detailWord.wort}
                  </Text>
                  <ReadAloudButton
                  text={
                  profileArticles.includes(detailWord.artikel) ?
                  `${detailWord.artikel} ${detailWord.wort}` :
                  detailWord.wort
                  }
                  language={activeProfile?.locale || 'de-DE'}
                  compact />

                  <Pressable
                  onPress={() => handleEdit(detailWord)}
                  hitSlop={10}
                  style={{ marginLeft: 20 }}>

                    <Ionicons name="pencil" size={20} color={colors.misc.text} />
                  </Pressable>
                  <Pressable
                  onPress={() => { setWordDeleteError(''); setConfirmingWordDelete(true); }}
                  hitSlop={10}
                  style={{ marginLeft: 16 }}>

                    <Ionicons name="trash" size={22} color={colors.die.text} />
                  </Pressable>
                </View>
                <Text style={styles.modalMeaning}>{detailWord.bedeutung}</Text>
                {detailWord.notizen ?
              <View style={styles.modalNotesBlock}>
                    <Text style={styles.modalNotesLabel}>{localize('NOTES')}</Text>
                    <Text style={styles.modalNotesText}>{detailWord.notizen}</Text>
                  </View> :
              null}
                <Pressable style={styles.modalCloseButton} onPress={() => setDetailWord(null)}>
                  <Text style={styles.modalCloseButtonText}>{localize('Close')}</Text>
                </Pressable>
              </> :
            null}
          </Pressable>
          </PopIn>
          <NestedConfirmDialog
            visible={confirmingWordDelete && Boolean(detailWord)}
            title={localize('Delete word?')}
            message={wordDeleteError || localize('This word will be removed.')}
            confirmText={localize('Delete')}
            destructive
            loading={deletingWord}
            onCancel={() => { setWordDeleteError(''); setConfirmingWordDelete(false); }}
            onConfirm={() => handleDelete(detailWord.id ?? detailWord._id)}
          />
        </Pressable>
      </Modal>
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.pageBg
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24
  },
  title: {
    fontSize: 30,
    lineHeight: 39
  },
  titleBold: {
    fontFamily: titleFont,
    fontWeight: '700',
    color: '#fff'
  },
  titleItalic: {
    fontFamily: titleFont,
    fontStyle: 'italic',
    color: '#fff'
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  dot: {
    color: '#7a7468'
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1
  },
  tabButtonActive: {
    backgroundColor: colors.headerBg,
    borderColor: colors.headerBg
  },
  tabButtonInactive: {
    backgroundColor: colors.cardBg,
    borderColor: colors.border
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted
  },
  tabButtonTextActive: {
    color: '#fff'
  },
  tabBadge: {
    fontSize: 13,
    fontWeight: '700'
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    flex: 1
  },
  searchInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark
  },
  filterRow: {
    marginTop: 14,
    flexGrow: 0
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700'
  },
  filterCount: {
    fontWeight: '400',
    opacity: 0.7
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: 20
  },
  listArea: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 16
  },
  sectionList: {
    flex: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.pageBg
  },
  sectionHeaderLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border
  },
  sectionHeaderText: {
    marginHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1
  },
  alphabetIndex: {
    width: 20,
    paddingVertical: 4,
    justifyContent: 'space-between'
  },
  alphabetIndexLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.misc.text,
    textAlign: 'center'
  },
  wordCard: {
    paddingVertical: 7,
    paddingHorizontal: 2
  },
  wordLine: {
    fontSize: 16
  },
  wordText: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textDark
  },
  pipeText: {
    color: colors.textDark,
    fontWeight: '900'
  },
  meaningText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textMuted
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalPopInWrap: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center'
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalWord: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textDark
  },
  modalMeaning: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textMuted
  },
  modalNotesBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  modalNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6
  },
  modalNotesText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: colors.headerBg,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  formRow: {
    flexDirection: 'row'
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4
  },
  pickerWrap: {
    borderColor: colors.misc.text
  },
  picker: {
    color: colors.misc.text
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
    marginBottom: 16
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18
  },
  saveButton: {
    flex: 1
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  clearButtonText: {
    color: colors.die.text,
    fontSize: 15,
    fontWeight: '700'
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
    marginBottom: 16
  },
  autofillButtonDisabled: {
    opacity: 0.5
  },
  autofillButtonText: {
    color: colors.misc.text,
    fontSize: 14,
    fontWeight: '700'
  },
  matchPanel: {
    backgroundColor: colors.misc.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  matchPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.misc.text,
    marginBottom: 6
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8
  },
  matchArtikel: {
    fontSize: 13,
    fontWeight: '700',
    width: 32
  },
  matchWort: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    flex: 0.4
  },
  matchBedeutung: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 0.6
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    zIndex: 100,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.headerBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  }
});
