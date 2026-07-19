import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  addNote,
  clearNotes,
  deleteNote,
  formatNoteContent,
  getNotes,
  updateNote,
} from '../services/notesService';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

// Closest built-in condensed sans-serif stand-in for "Alternate Gothic" (not bundled).
const noteTitleFont = Platform.select({
  ios: 'AvenirNextCondensed-Bold',
  android: 'sans-serif-condensed',
  default: 'sans-serif-condensed',
});

const NOTE_PREVIEW_TRUNCATE_LENGTH = 65;

function truncatePreview(content) {
  if (!content) return '';
  if (content.length <= NOTE_PREVIEW_TRUNCATE_LENGTH) return content;
  return `${content.slice(0, NOTE_PREVIEW_TRUNCATE_LENGTH)}...`;
}

function formatNoteDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState('add');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailNote, setDetailNote] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getNotes();
      setNotes(fetched);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to load notes.';
      Alert.alert('Fehler', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const canSave = title.trim() !== '' && content.trim() !== '';

  const handleFormat = async () => {
    if (content.trim() === '' || formatting) return;
    setFormatting(true);
    try {
      const formatted = await formatNoteContent(content.trim());
      setContent(formatted);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Could not format this note.';
      Alert.alert('Formatierung fehlgeschlagen', msg);
    } finally {
      setFormatting(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateNote(editingId, { title: title.trim(), content: content.trim() });
        resetForm();
        await load();
        setMode('list');
      } else {
        await addNote({ title: title.trim(), content: content.trim() });
        resetForm();
        await load();
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to save note.';
      Alert.alert('Fehler', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setTitle(note.title ?? '');
    setContent(note.content ?? '');
    setDetailNote(null);
    setMode('add');
  };

  const handleDelete = (id, onDeleted) => {
    Alert.alert('Notiz löschen?', 'This note will be removed.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(id);
            await load();
            onDeleted?.();
          } catch (err) {
            const msg = err.response?.data?.error ?? err.message ?? 'Failed to delete note.';
            Alert.alert('Fehler', msg);
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (notes.length === 0) return;
    Alert.alert('Alle Notizen löschen?', 'This removes every saved note. This cannot be undone.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alle löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearNotes();
            await load();
          } catch (err) {
            const msg = err.response?.data?.error ?? err.message ?? 'Failed to clear notes.';
            Alert.alert('Fehler', msg);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>Meine </Text>
          <Text style={styles.titleItalic}>Notizen</Text>
        </Text>
        <Text style={styles.subtitle}>Wichtige Notizen, die du täglich findest.</Text>
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
            {editingId ? 'Notiz bearbeiten' : '+ Neue Notiz'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, mode === 'list' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => {
            if (editingId) resetForm();
            setMode('list');
          }}
        >
          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'list' && styles.tabButtonTextActive]}
          >
            Notizen <Text style={styles.tabBadge}>{notes.length}</Text>
          </Text>
        </Pressable>
      </View>

      {mode === 'add' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.label}>TITEL *</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Meeting notes"
              placeholderTextColor={colors.placeholder}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>INHALT *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Paste your notes here…"
              placeholderTextColor={colors.placeholder}
              value={content}
              onChangeText={setContent}
              multiline
            />

            <Pressable
              style={[styles.autofillButton, (content.trim() === '' || formatting) && styles.autofillButtonDisabled]}
              onPress={handleFormat}
              disabled={content.trim() === '' || formatting}
            >
              <Ionicons name="sparkles" size={15} color={colors.misc.text} />
              <Text style={styles.autofillButtonText}>
                {formatting ? 'Formatiert…' : 'Format mit KI'}
              </Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.saveButton, canSave ? styles.saveButtonActive : styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Speichern…' : editingId ? 'Änderungen speichern' : 'Notiz speichern'}
                </Text>
              </Pressable>

              <Pressable style={styles.clearButton} onPress={resetForm}>
                <Ionicons name="close-outline" size={16} color={colors.textDark} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderText}>GESPEICHERT ({notes.length})</Text>
            <Pressable style={styles.clearAllButton} onPress={handleClearAll} disabled={notes.length === 0}>
              <Ionicons name="trash-outline" size={16} color={notes.length === 0 ? colors.textMuted : colors.textDark} />
              <Text style={[styles.clearAllButtonText, notes.length === 0 && { color: colors.textMuted }]}>
                Clear All
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <Text style={styles.emptyText}>Lädt…</Text>
          ) : notes.length === 0 ? (
            <Text style={styles.emptyText}>Noch keine Notizen. Füge deine erste Notiz im Tab „Neue Notiz" hinzu!</Text>
          ) : (
            notes.map((note) => (
              <Pressable key={note.id} style={styles.noteCard} onPress={() => setDetailNote(note)}>
                <View style={styles.noteCardHeader}>
                  <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
                  <View style={styles.noteDates}>
                    <Text style={styles.noteDateText}>Erstellt: {formatNoteDate(note.createdAt)}</Text>
                    <Text style={styles.noteDateText}>Bearbeitet: {formatNoteDate(note.updatedAt)}</Text>
                  </View>
                </View>
                <Text style={styles.notePreview}>{truncatePreview(note.content)}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!detailNote}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailNote(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetailNote(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {detailNote ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{detailNote.title}</Text>
                  <Pressable
                    onPress={() => handleEdit(detailNote)}
                    hitSlop={10}
                    style={{ marginLeft: 20 }}
                  >
                    <Ionicons name="pencil" size={20} color={colors.misc.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(detailNote.id, () => setDetailNote(null))}
                    hitSlop={10}
                    style={{ marginLeft: 16 }}
                  >
                    <Ionicons name="trash" size={22} color={colors.die.text} />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalContent}>{detailNote.content}</Text>
                </ScrollView>
                <Pressable style={styles.modalCloseButton} onPress={() => setDetailNote(null)}>
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

const makeStyles = (colors) => StyleSheet.create({
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
    color: '#cfc9bd',
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
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
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
    minHeight: 140,
    textAlignVertical: 'top',
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonActive: {
    backgroundColor: colors.headerBg,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabledButton,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearAllButtonText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: 20,
  },
  noteCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    flex: 1,
    fontFamily: noteTitleFont,
    fontSize: 32,
    fontWeight: '800',
    color: colors.textDark,
    marginRight: 12,
  },
  noteDates: {
    alignItems: 'flex-end',
  },
  noteDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  notePreview: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
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
    maxWidth: 420,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: colors.textDark,
  },
  modalScroll: {
    marginTop: 12,
  },
  modalContent: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  modalCloseButton: {
    marginTop: 16,
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
});
