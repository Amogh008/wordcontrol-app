import { localize } from "../locales";import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import OutlinedButton from '../components/OutlinedButton';
import { useAppDialog } from '../context/AppDialogContext';
import {
  addNote,
  deleteNote,
  formatNoteContent,
  getNotes,
  updateNote } from
'../services/notesService';

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

// Closest built-in condensed sans-serif stand-in for "Alternate Gothic" (not bundled).
const noteTitleFont = Platform.select({
  ios: 'AvenirNextCondensed-Bold',
  android: 'sans-serif-condensed',
  default: 'sans-serif-condensed'
});

const NOTE_PREVIEW_TRUNCATE_LENGTH = 65;

function truncatePreview(content) {
  if (!content) return '';
  if (content.length <= NOTE_PREVIEW_TRUNCATE_LENGTH) return content;
  return `${content.slice(0, NOTE_PREVIEW_TRUNCATE_LENGTH)}...`;
}

function formatNoteDate(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotesScreen() {
  const dialog = useAppDialog();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isDe = language === 'de';
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState('add');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailNote, setDetailNote] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      dialog.alert(localize('Error'), msg);
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
      dialog.alert(localize('Formatting failed'), msg);
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
      dialog.alert(localize('Error'), msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setTitle(note.title ?? '');
    setContent(note.content ?? '');
    setConfirmingDelete(false);
    setDetailNote(null);
    setMode('add');
  };

  const handleDelete = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteNote(id);
      setDetailNote(null);
      setConfirmingDelete(false);
      await load();
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to delete note.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleBold}>{localize('My ')}</Text>
          <Text style={styles.titleItalic}>{localize('Notes')}</Text>
        </Text>
        <Text style={styles.subtitle}>{localize('Keep useful language notes in one place.')}</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, mode === 'add' ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setMode('add')}>

          <Text
            numberOfLines={1}
            style={[styles.tabButtonText, mode === 'add' && styles.tabButtonTextActive]}>

            {editingId ? localize('Edit note') : localize('+ New note')}
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

            {localize('Notes')} <Text style={styles.tabBadge}>{notes.length}</Text>
          </Text>
        </Pressable>
      </View>

      {mode === 'add' ?
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.label}>{localize('TITLE')}{localize("*")}</Text>
            <TextInput
            style={styles.input}
            placeholder={localize('e.g. Meeting notes')}
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle} />


            <Text style={styles.label}>{localize('CONTENT')}{localize("*")}</Text>
            <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={localize('Paste your notes here…')}
            placeholderTextColor={colors.placeholder}
            value={content}
            onChangeText={setContent}
            multiline />


            <Pressable
            style={[styles.autofillButton, (content.trim() === '' || formatting) && styles.autofillButtonDisabled]}
            onPress={handleFormat}
            disabled={content.trim() === '' || formatting}>

              <Ionicons name="sparkles" size={15} color={colors.misc.text} />
              <Text style={styles.autofillButtonText}>
                {formatting ? localize('Formatting…') : localize('Format with AI')}
              </Text>
            </Pressable>

            <View style={styles.actionRow}>
              <OutlinedButton
              title={saving ? localize('Saving…') : editingId ? localize('Save changes') : localize('Save note')}
              icon="save"
              tone="success"
              onPress={handleSave}
              disabled={!canSave || saving}
              loading={saving}
              style={styles.saveButton} />


              <Pressable style={styles.clearButton} onPress={resetForm}>
                <Ionicons name="refresh-outline" size={16} color={colors.textDark} />
                <Text style={styles.clearButtonText}>{localize('Clear')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView> :

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderText}>{localize('SAVED')}{localize("(")}{notes.length}{localize(")")}</Text>
          </View>

          {loading ?
        <Text style={styles.emptyText}>{localize('Loading…')}</Text> :
        notes.length === 0 ?
        <Text style={styles.emptyText}>{localize('No notes yet. Add your first note from the New note tab!')}</Text> :

        notes.map((note) =>
        <Pressable
          key={note.id}
          style={styles.noteCard}
          onPress={() => {
            setConfirmingDelete(false);
            setDetailNote(note);
          }}>

                <View style={styles.noteCardHeader}>
                  <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
                  <View style={styles.noteDates}>
                    <Text style={styles.noteDateText}>{localize('Created')}{localize(":")}{formatNoteDate(note.createdAt, localize('en-US'))}</Text>
                    <Text style={styles.noteDateText}>{localize('Updated')}{localize(":")}{formatNoteDate(note.updatedAt, localize('en-US'))}</Text>
                  </View>
                </View>
                <Text style={styles.notePreview}>{truncatePreview(note.content)}</Text>
              </Pressable>
        )
        }
        </ScrollView>
      }

      <Modal
        visible={!!detailNote}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setConfirmingDelete(false);
          setDetailNote(null);
        }}>

        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {}} />

          <View style={styles.modalCard}>
            {detailNote ?
            confirmingDelete ?
            <>
                  <Text style={styles.deleteConfirmTitle}>{localize('Delete note?')}</Text>
                  <Text style={styles.deleteConfirmText}>
                    {deleteError || localize('This note will be permanently deleted.')}
                  </Text>
                  <View style={styles.deleteConfirmActions}>
                    <Pressable
                  style={styles.deleteCancelButton}
                  onPress={() => { setDeleteError(''); setConfirmingDelete(false); }}
                  disabled={deleting}>

                      <Text style={styles.deleteCancelText}>{localize('Cancel')}</Text>
                    </Pressable>
                    <Pressable
                  style={[styles.deleteConfirmButton, deleting && styles.deleteButtonDisabled]}
                  onPress={() => handleDelete(detailNote.id)}
                  disabled={deleting}>

                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.deleteConfirmButtonText}>
                        {deleting ? localize('Deleting…') : localize('Delete')}
                      </Text>
                    </Pressable>
                  </View>
                </> :

            <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{detailNote.title}</Text>
                  <Pressable
                  onPress={() => handleEdit(detailNote)}
                  hitSlop={10}
                  style={{ marginLeft: 20 }}>

                    <Ionicons name="pencil" size={20} color={colors.misc.text} />
                  </Pressable>
                  <Pressable
                  onPress={() => { setDeleteError(''); setConfirmingDelete(true); }}
                  hitSlop={10}
                  style={{ marginLeft: 16 }}>

                    <Ionicons name="trash" size={22} color={colors.die.text} />
                  </Pressable>
                </View>
                <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator>

                  <Text style={styles.modalContent}>{detailNote.content}</Text>
                </ScrollView>
                <Pressable
                style={styles.modalCloseButton}
                onPress={() => {
                  setConfirmingDelete(false);
                  setDetailNote(null);
                }}>

                  <Text style={styles.modalCloseButtonText}>{localize('Close')}</Text>
                </Pressable>
              </> :

            null}
          </View>
        </View>
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
    fontWeight: '600',
    color: '#cfc9bd'
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
    paddingBottom: 40
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 4
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
    minHeight: 140,
    textAlignVertical: 'top'
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
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  saveButton: {
    flex: 1
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
    paddingHorizontal: 16
  },
  clearButtonText: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700'
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  listHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: 20
  },
  noteCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  noteTitle: {
    flex: 1,
    fontFamily: noteTitleFont,
    fontSize: 32,
    fontWeight: '800',
    color: colors.textDark,
    marginRight: 12
  },
  noteDates: {
    alignItems: 'flex-end'
  },
  noteDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted
  },
  notePreview: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%'
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: colors.textDark
  },
  modalScroll: {
    flexShrink: 1,
    marginTop: 12
  },
  modalScrollContent: {
    paddingBottom: 4
  },
  modalContent: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22
  },
  modalCloseButton: {
    marginTop: 16,
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
  deleteConfirmTitle: {
    color: colors.textDark,
    fontSize: 21,
    fontWeight: '900'
  },
  deleteConfirmText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22
  },
  deleteCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12
  },
  deleteCancelText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700'
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: colors.die.text
  },
  deleteButtonDisabled: {
    opacity: 0.6
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  }
});
