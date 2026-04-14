import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FamilyMember } from '@/types';

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const letter = (name ?? '?').charAt(0).toUpperCase();
  const colors = ['#90CAF9', '#A5D6A7', '#CE93D8', '#FFCC80', '#FFCCBC'];
  const bg = colors[letter.charCodeAt(0) % colors.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.42, fontFamily: 'Inter_700Bold', color: '#fff' }}>{letter}</Text>
    </View>
  );
}

export default function FamilyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const {
    familyGroup, familyMembers, loadingFamily, familyError,
    createFamilyGroup, updateGroupName, addFamilyMember, removeFamilyMember, reloadFamily,
  } = useFamilyContext();

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit group name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Add member
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const codeRef = useRef<TextInput>(null);

  const handleCreate = async () => {
    const name = groupName.trim() || 'Моя семья';
    setCreating(true);
    try {
      await createFamilyGroup(name);
    } catch (e: any) {
      if (e?.message === 'table_missing') {
        Alert.alert(
          'Требуется настройка базы данных',
          'Таблицы семейных групп не найдены в Supabase. Выполните файл supabase_family_groups.sql в SQL Editor вашего проекта Supabase.',
        );
      } else {
        Alert.alert('Ошибка', `Не удалось создать группу: ${e?.message ?? 'неизвестная ошибка'}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateGroupName(trimmed);
      setEditingName(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить название.');
    } finally {
      setSavingName(false);
    }
  };

  const handleAddMember = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!/^\d{1,5}$/.test(trimmed)) {
      setAddError('Код должен содержать только цифры (5 знаков)');
      return;
    }
    if (trimmed.padStart(5, '0') === profile?.invite_code) {
      setAddError('Нельзя добавить себя');
      return;
    }
    setAdding(true);
    setAddError('');
    Keyboard.dismiss();
    const result = await addFamilyMember(trimmed);
    setAdding(false);
    if (result === 'ok') {
      setCode('');
    } else if (result === 'not_found') {
      setAddError('Пользователь с таким кодом не найден');
    } else if (result === 'already_member') {
      setAddError('Этот пользователь уже в вашей семье');
    } else {
      setAddError('Не удалось добавить. Попробуйте снова.');
    }
  };

  const handleRemove = (member: FamilyMember) => {
    const name = member.profile?.name ?? 'участника';
    Alert.alert(
      'Удалить из семьи',
      `Удалить ${name} из семейной группы?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: () => removeFamilyMember(member.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 8 : 8),
        borderBottomColor: colors.border,
      }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Семейная группа</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingFamily ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : familyError === 'table_missing' ? (
        /* ── SQL migration not run yet ── */
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.emptyBlock}>
            <View style={[styles.emptyIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="warning-outline" size={44} color="#FF8F00" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Требуется настройка</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Таблицы семейных групп не найдены в базе данных. Нужно выполнить SQL-миграцию в Supabase.
            </Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#FFF8E1', borderRadius: colors.radius, borderWidth: 1, borderColor: '#FFD54F' }]}>
            <Text style={[styles.sectionTitle, { color: '#5D4037' }]}>Как исправить:</Text>
            <Text style={[styles.stepText, { color: '#5D4037' }]}>1. Откройте ваш проект на supabase.com</Text>
            <Text style={[styles.stepText, { color: '#5D4037' }]}>2. Перейдите в раздел SQL Editor</Text>
            <Text style={[styles.stepText, { color: '#5D4037' }]}>3. Вставьте и выполните содержимое файла:</Text>
            <View style={[styles.codeBox, { backgroundColor: '#37474F', borderRadius: colors.radius - 6 }]}>
              <Text style={styles.codeText}>supabase_family_groups.sql</Text>
            </View>
            <Text style={[styles.stepText, { color: '#5D4037' }]}>4. Вернитесь и нажмите «Повторить»</Text>
          </View>
          <Pressable
            onPress={reloadFamily}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Повторить</Text>
          </Pressable>
        </ScrollView>
      ) : !familyGroup ? (
        /* ── No group: create form ── */
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.emptyBlock}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="people-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Создайте семейную группу</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Добавьте членов семьи один раз и быстро приглашайте их в любую поездку без ввода кода каждый раз
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
            <Input
              label="Название группы"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Моя семья"
            />
            <Button
              title="Создать группу"
              onPress={handleCreate}
              loading={creating}
              fullWidth
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      ) : (
        /* ── Has group: manage ── */
        <FlatList
          data={familyMembers}
          keyExtractor={m => m.id}
          ListHeaderComponent={() => (
            <View>
              {/* Group name card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIcon, { backgroundColor: colors.primary + '22' }]}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {editingName ? (
                      <View style={styles.nameEditRow}>
                        <TextInput
                          value={nameInput}
                          onChangeText={setNameInput}
                          style={[styles.nameInput, {
                            color: colors.foreground,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            borderRadius: colors.radius - 6,
                          }]}
                          placeholder="Название группы"
                          placeholderTextColor={colors.mutedForeground}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={handleSaveName}
                        />
                        <Pressable
                          onPress={handleSaveName}
                          disabled={savingName}
                          style={[styles.saveNameBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 6 }]}
                        >
                          {savingName
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="checkmark" size={18} color="#fff" />
                          }
                        </Pressable>
                        <Pressable
                          onPress={() => setEditingName(false)}
                          style={[styles.saveNameBtn, { backgroundColor: colors.muted, borderRadius: colors.radius - 6 }]}
                        >
                          <Ionicons name="close" size={18} color={colors.mutedForeground} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.nameViewRow}>
                        <Text style={[styles.groupName, { color: colors.foreground }]}>{familyGroup.name}</Text>
                        <Pressable onPress={() => { setNameInput(familyGroup.name); setEditingName(true); }} hitSlop={10}>
                          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        </Pressable>
                      </View>
                    )}
                    <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
                      {familyMembers.length === 0
                        ? 'Пока нет участников'
                        : `${familyMembers.length} ${familyMembers.length === 1 ? 'участник' : familyMembers.length < 5 ? 'участника' : 'участников'}`
                      }
                    </Text>
                  </View>
                </View>
              </View>

              {/* Members title */}
              {familyMembers.length === 0 && (
                <View style={[styles.emptyMembersCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  <Ionicons name="person-add-outline" size={32} color={colors.primary} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground, fontSize: 15 }]}>Нет участников</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Добавьте членов семьи по их 5-значному коду из профиля
                  </Text>
                </View>
              )}
              {familyMembers.length > 0 && (
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>УЧАСТНИКИ</Text>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const name = item.profile?.name ?? item.profile?.email ?? 'Участник';
            return (
              <View style={[styles.memberCard, { backgroundColor: colors.surface, borderRadius: colors.radius - 4 }]}>
                <Avatar name={name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{name}</Text>
                  {item.profile?.invite_code && (
                    <Text style={[styles.memberCode, { color: colors.mutedForeground }]}>
                      Код: {item.profile.invite_code}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
                  <Ionicons name="person-remove-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            );
          }}
          ListFooterComponent={() => (
            /* Add member section */
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius, marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Добавить участника</Text>
              <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                Попросите члена семьи открыть профиль и сообщить свой 5-значный код
              </Text>
              <View style={[styles.inputRow, {
                backgroundColor: colors.background,
                borderColor: addError ? colors.destructive : colors.border,
                borderRadius: colors.radius - 4,
              }]}>
                <Ionicons name="keypad-outline" size={18} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 5)); setAddError(''); }}
                  placeholder="12345"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="send"
                  onSubmitEditing={handleAddMember}
                  style={[styles.codeInput, { color: colors.foreground }]}
                />
                <Pressable
                  onPress={handleAddMember}
                  disabled={adding || code.trim().length === 0}
                  style={[styles.sendBtn, {
                    backgroundColor: code.trim() ? colors.primary : colors.muted,
                    borderRadius: colors.radius - 6,
                    opacity: adding ? 0.7 : 1,
                  }]}
                >
                  {adding
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="person-add-outline" size={18} color={code.trim() ? '#fff' : colors.mutedForeground} />
                  }
                </Pressable>
              </View>
              {addError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{addError}</Text>
              ) : null}
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 16, gap: 16 },
  listContent: { padding: 16, gap: 12 },

  emptyBlock: { alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 8 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  emptyMembersCard: {
    padding: 24, alignItems: 'center', gap: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },

  card: {
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  nameViewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  groupMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  nameInput: {
    flex: 1, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 15, fontFamily: 'Inter_500Medium',
  },
  saveNameBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: {
    fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.8,
    marginTop: 4, marginBottom: 4, marginLeft: 4,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  memberName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  memberCode: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  addHint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, overflow: 'hidden',
  },
  codeInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 18, fontFamily: 'Inter_600SemiBold', letterSpacing: 6,
  },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', margin: 4 },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  stepText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  codeBox: { padding: 12, alignItems: 'center' },
  codeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#90CAF9', letterSpacing: 0.5 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  retryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
