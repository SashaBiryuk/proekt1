import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import { MemberRole, TripNote } from '@/types';

interface NotesTabProps {
  tripId: string;
  userRole: MemberRole;
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function NotesTab({ tripId, userRole }: NotesTabProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getNotes, addNote, deleteNote } = useTrips();
  const [notes, setNotes] = useState<TripNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const canEdit = userRole === 'owner' || userRole === 'member';
  const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 84 : 56;

  useEffect(() => { loadNotes(); }, [tripId]);

  const loadNotes = async () => {
    setLoading(true);
    const data = await getNotes(tripId);
    setNotes(data);
    setLoading(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert(
      'Удалить заметку',
      'Это действие нельзя отменить. Удалить запись?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
          },
        },
      ],
    );
  };

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    Keyboard.dismiss();
    const note = await addNote(tripId, trimmed, 'manual');
    setSaving(false);
    if (note) {
      setNotes(prev => [note, ...prev]);
      setText('');
      setShowModal(false);
    }
  };

  const renderNote = ({ item }: { item: TripNote }) => {
    const isSystem = item.type === 'system';
    const isOwner = userRole === 'owner';
    return (
      <View
        style={[
          styles.noteCard,
          {
            backgroundColor: isSystem ? colors.primary + '14' : colors.surface,
            borderRadius: colors.radius - 2,
            borderLeftColor: isSystem ? colors.primary : colors.card,
            borderLeftWidth: 3,
          },
        ]}
      >
        <View style={styles.noteHeader}>
          {isSystem ? (
            <View style={styles.noteAuthorRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.noteAuthor, { color: colors.primary }]}>Система</Text>
            </View>
          ) : (
            <View style={styles.noteAuthorRow}>
              <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.noteAuthor, { color: colors.mutedForeground }]}>
                {item.author_name ?? 'Участник'}
              </Text>
            </View>
          )}
          <View style={styles.noteHeaderRight}>
            <Text style={[styles.noteDate, { color: colors.mutedForeground }]}>
              {formatNoteDate(item.created_at)}
            </Text>
            {isOwner && (
              <Pressable
                onPress={() => handleDelete(item.id)}
                hitSlop={10}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={15} color="#EF5350" />
              </Pressable>
            )}
          </View>
        </View>
        <Text style={[styles.noteContent, { color: colors.foreground }]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        keyExtractor={n => n.id}
        renderItem={renderNote}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + (canEdit ? 80 : 20) },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {notes.length > 0
                ? `${notes.length} ${notes.length === 1 ? 'запись' : notes.length <= 4 ? 'записи' : 'записей'}`
                : 'Нет записей'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Нет заметок</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {canEdit
                  ? 'Добавьте первую заметку для участников поездки'
                  : 'Владелец ещё не добавил заметок'}
              </Text>
            </View>
          )
        }
      />

      {/* FAB — только для владельца и участника */}
      {canEdit && (
        <Pressable
          onPress={() => {
            setText('');
            setShowModal(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              bottom: insets.bottom + TAB_BAR_HEIGHT + 12,
            },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>Добавить заметку</Text>
        </Pressable>
      )}

      {/* Add note modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)} hitSlop={12}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Отмена</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Новая заметка</Text>
            <Pressable onPress={handleAdd} disabled={saving || !text.trim()} hitSlop={12}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[
                    styles.modalSave,
                    { color: text.trim() ? colors.primary : colors.mutedForeground },
                  ]}>Добавить</Text>
              }
            </Pressable>
          </View>

          {/* Text input */}
          <View style={styles.modalBody}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Введите заметку для участников поездки..."
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.textArea,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderRadius: colors.radius - 4,
                  borderColor: colors.border,
                },
              ]}
              autoFocus
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Заметки видят все участники поездки
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: 16,
    paddingTop: 4,
    flexGrow: 1,
  },
  listHeader: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  /* Note card */
  noteCard: {
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 2,
  },
  noteAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteAuthor: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  noteDate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  noteContent: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },

  /* Empty */
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },

  /* Modal */
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  modalCancel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalSave: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  modalBody: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  textArea: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 140,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
