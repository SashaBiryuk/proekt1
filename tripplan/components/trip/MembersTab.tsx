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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { FamilyMember, MemberRole, MEMBER_ROLE_COLORS, MEMBER_ROLE_LABELS, TripMember } from '@/types';

interface MembersTabProps {
  tripId: string;
  ownerId: string;
  userRole: MemberRole;
}

function Avatar({ name, size = 44, color }: { name: string; size?: number; color: string }) {
  const letter = (name ?? '?').charAt(0).toUpperCase();
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size * 0.42, fontFamily: 'Inter_700Bold', color: '#fff' }}>{letter}</Text>
    </View>
  );
}

const ROLE_OPTIONS: { value: 'member' | 'viewer'; label: string; desc: string }[] = [
  { value: 'member', label: MEMBER_ROLE_LABELS.member, desc: 'Может добавлять и удалять записи' },
  { value: 'viewer', label: MEMBER_ROLE_LABELS.viewer, desc: 'Только чтение, без доступа к копилке' },
];

const AVATAR_COLORS = ['#90CAF9', '#A5D6A7', '#CE93D8', '#FFCC80', '#FFCCBC'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export function MembersTab({ tripId, ownerId, userRole }: MembersTabProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const { getMembers, addMemberByCode, addMemberById, removeMember, updateMemberRole } = useTrips();
  const { familyGroup, familyMembers } = useFamilyContext();

  const [members, setMembers] = useState<TripMember[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Role picker modal
  const [rolePickerMember, setRolePickerMember] = useState<TripMember | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Family picker modal
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(new Set());
  const [familyRole, setFamilyRole] = useState<'member' | 'viewer'>('member');
  const [addingFamily, setAddingFamily] = useState(false);

  const isOwner = userRole === 'owner';

  useEffect(() => { loadMembers(); }, [tripId]);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getMembers(tripId);
    setMembers(data);
    if (profile?.id !== ownerId) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: op } = await supabase.from('profiles').select('name').eq('id', ownerId).single();
        if (op) setOwnerProfile({ name: op.name ?? 'Владелец' });
      } catch {}
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!/^\d{1,5}$/.test(trimmed)) {
      setAddError('Код должен содержать только цифры (5 знаков)');
      return;
    }
    const paddedCode = trimmed.padStart(5, '0');
    if (paddedCode === profile?.invite_code) {
      setAddError('Нельзя добавить себя');
      return;
    }
    setAdding(true);
    setAddError('');
    Keyboard.dismiss();
    const result = await addMemberByCode(tripId, paddedCode);
    setAdding(false);
    if (result === 'ok') {
      setCode('');
      await loadMembers();
    } else if (result === 'not_found') {
      setAddError('Пользователь с таким кодом не найден');
    } else if (result === 'already_member') {
      setAddError('Этот пользователь уже является участником поездки');
    } else {
      setAddError('Не удалось добавить участника. Попробуйте снова.');
    }
  };

  const handleRemove = (member: TripMember) => {
    const name = member.profile?.name ?? member.profile?.email ?? 'участника';
    Alert.alert('Удалить участника', `Удалить ${name} из поездки?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await removeMember(member.id);
          setMembers(prev => prev.filter(m => m.id !== member.id));
        },
      },
    ]);
  };

  const handleChangeRole = async (member: TripMember, newRole: 'member' | 'viewer') => {
    if (member.role === newRole) { setRolePickerMember(null); return; }
    setUpdatingRole(true);
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    const ok = await updateMemberRole(member.id, newRole);
    if (!ok) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: member.role } : m));
      Alert.alert('Ошибка', 'Не удалось изменить роль. Убедитесь, что в Supabase есть политика UPDATE для trip_members.');
    }
    setUpdatingRole(false);
    setRolePickerMember(null);
  };

  // Family picker helpers
  const alreadyInTrip = new Set(members.map(m => m.user_id).concat([ownerId]));
  const availableFamilyMembers = familyMembers.filter(fm => !alreadyInTrip.has(fm.user_id));

  const toggleFamilyMember = (userId: string) => {
    setSelectedFamilyIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleAddFromFamily = async () => {
    if (selectedFamilyIds.size === 0) return;
    setAddingFamily(true);
    const toAdd = familyMembers.filter(fm => selectedFamilyIds.has(fm.user_id));
    await Promise.all(toAdd.map(fm => addMemberById(tripId, fm.user_id, familyRole)));
    await loadMembers();
    setSelectedFamilyIds(new Set());
    setShowFamilyPicker(false);
    setAddingFamily(false);
  };

  const ownerName = profile?.id === ownerId
    ? (profile?.name ?? 'Вы')
    : (ownerProfile?.name ?? members.find(m => m.user_id === ownerId)?.profile?.name ?? 'Владелец');

  const hasFamilyToAdd = isOwner && familyGroup && availableFamilyMembers.length > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={m => m.id}
        ListHeaderComponent={() => (
          <View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Участники</Text>
              <View style={styles.memberRow}>
                <Avatar name={ownerName} color={MEMBER_ROLE_COLORS.owner} />
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{ownerName}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: MEMBER_ROLE_COLORS.owner + '33' }]}>
                      <Text style={[styles.roleText, { color: MEMBER_ROLE_COLORS.owner }]}>{MEMBER_ROLE_LABELS.owner}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
            </View>

            {members.length === 0 && !loading && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                <Ionicons name="people-outline" size={32} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Нет участников</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isOwner
                    ? 'Пригласите по коду или добавьте из семьи'
                    : 'В этой поездке пока нет других участников'}
                </Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => {
          const name = item.profile?.name ?? item.profile?.email ?? 'Участник';
          const color = avatarColor(name);
          const role = (item.role as MemberRole) ?? 'member';
          const roleColor = MEMBER_ROLE_COLORS[role] ?? MEMBER_ROLE_COLORS.member;
          return (
            <View style={[styles.memberCard, { backgroundColor: colors.surface, borderRadius: colors.radius - 4 }]}>
              <Avatar name={name} size={40} color={color} />
              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{name}</Text>
                  <Pressable
                    onPress={isOwner ? () => setRolePickerMember(item) : undefined}
                    style={[styles.roleBadge, { backgroundColor: roleColor + '33' }]}
                    hitSlop={6}
                  >
                    <Text style={[styles.roleText, { color: roleColor }]}>{MEMBER_ROLE_LABELS[role]}</Text>
                    {isOwner && <Ionicons name="chevron-down" size={10} color={roleColor} style={{ marginLeft: 2 }} />}
                  </Pressable>
                </View>
                {item.profile?.invite_code && (
                  <Text style={[styles.memberCode, { color: colors.mutedForeground }]}>Код: {item.profile.invite_code}</Text>
                )}
              </View>
              {isOwner && (
                <Pressable onPress={() => handleRemove(item)} hitSlop={8} style={styles.removeBtn}>
                  <Ionicons name="person-remove-outline" size={18} color={colors.destructive} />
                </Pressable>
              )}
            </View>
          );
        }}
        ListFooterComponent={() =>
          isOwner ? (
            <View style={{ gap: 12 }}>
              {/* Add from family */}
              {familyGroup && (
                <View style={[styles.addCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
                  <View style={styles.familyHeaderRow}>
                    <View style={[styles.familyIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="people" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Добавить из семьи</Text>
                      <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                        {familyGroup.name}
                      </Text>
                    </View>
                  </View>

                  {availableFamilyMembers.length === 0 ? (
                    <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                      {familyMembers.length === 0
                        ? 'Семейная группа пуста. Добавьте участников в «Семейная группа» в профиле.'
                        : 'Все члены семьи уже добавлены в поездку'}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                        Выберите кого добавить в эту поездку
                      </Text>
                      {availableFamilyMembers.slice(0, 3).map(fm => {
                        const name = fm.profile?.name ?? 'Участник';
                        return (
                          <View key={fm.id} style={[styles.familyMemberRow, { backgroundColor: colors.background, borderRadius: colors.radius - 6 }]}>
                            <Avatar name={name} size={36} color={avatarColor(name)} />
                            <Text style={[styles.memberName, { color: colors.foreground, flex: 1 }]}>{name}</Text>
                          </View>
                        );
                      })}
                      {availableFamilyMembers.length > 3 && (
                        <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                          и ещё {availableFamilyMembers.length - 3}...
                        </Text>
                      )}
                      <Pressable
                        onPress={() => { setSelectedFamilyIds(new Set()); setShowFamilyPicker(true); }}
                        style={[styles.familyPickerBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}
                      >
                        <Ionicons name="person-add-outline" size={16} color={colors.primaryForeground} />
                        <Text style={[styles.familyPickerBtnText, { color: colors.primaryForeground }]}>
                          Выбрать участников
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {/* Invite by code */}
              <View style={[styles.addCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Пригласить по коду</Text>
                <Text style={[styles.addHint, { color: colors.mutedForeground }]}>
                  Попросите друга открыть профиль и сообщить свой 5-значный код
                </Text>
                <View style={[styles.inputRow, {
                  backgroundColor: colors.background,
                  borderColor: addError ? colors.destructive : colors.border,
                  borderRadius: colors.radius - 4,
                }]}>
                  <Ionicons name="keypad-outline" size={18} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
                  <TextInput
                    ref={inputRef}
                    value={code}
                    onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 5)); setAddError(''); }}
                    placeholder="12345"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={5}
                    returnKeyType="send"
                    onSubmitEditing={handleAdd}
                    style={[styles.textInput, { color: colors.foreground, letterSpacing: 6 }]}
                  />
                  <Pressable
                    onPress={handleAdd}
                    disabled={adding || code.trim().length === 0}
                    style={[styles.sendBtn, {
                      backgroundColor: code.trim() ? colors.primary : colors.muted,
                      borderRadius: colors.radius - 6,
                      opacity: adding ? 0.7 : 1,
                    }]}
                  >
                    {adding
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="person-add-outline" size={18} color={code.trim() ? colors.primaryForeground : colors.mutedForeground} />
                    }
                  </Pressable>
                </View>
                {addError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{addError}</Text> : null}
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Role picker modal */}
      <Modal visible={!!rolePickerMember} transparent animationType="fade" onRequestClose={() => setRolePickerMember(null)}>
        <Pressable style={styles.overlay} onPress={() => setRolePickerMember(null)}>
          <Pressable style={[styles.roleSheet, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Роль: {rolePickerMember?.profile?.name ?? 'участник'}
            </Text>
            {ROLE_OPTIONS.map(opt => {
              const active = rolePickerMember?.role === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => rolePickerMember && handleChangeRole(rolePickerMember, opt.value)}
                  disabled={updatingRole}
                  style={[styles.roleOption, {
                    backgroundColor: active ? MEMBER_ROLE_COLORS[opt.value] + '22' : 'transparent',
                    borderRadius: colors.radius - 4,
                  }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleOptionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                    <Text style={[styles.roleOptionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={MEMBER_ROLE_COLORS[opt.value]} />}
                </Pressable>
              );
            })}
            {updatingRole && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Family picker modal */}
      <Modal visible={showFamilyPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFamilyPicker(false)}>
        <View style={[styles.familyModal, { backgroundColor: colors.background }]}>
          <View style={[styles.familyModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Добавить из семьи</Text>
            <Pressable onPress={() => setShowFamilyPicker(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {/* Role selector */}
            <Text style={[styles.roleSelectorLabel, { color: colors.mutedForeground }]}>Роль для всех добавляемых</Text>
            <View style={styles.roleToggleRow}>
              {ROLE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => setFamilyRole(opt.value)}
                  style={[styles.roleToggleBtn, {
                    backgroundColor: familyRole === opt.value ? MEMBER_ROLE_COLORS[opt.value] : colors.muted,
                    borderRadius: colors.radius - 6,
                    flex: 1,
                  }]}
                >
                  <Text style={[styles.roleToggleText, {
                    color: familyRole === opt.value ? '#1A2332' : colors.mutedForeground,
                  }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.roleSelectorLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
              Выберите кого добавить
            </Text>

            {availableFamilyMembers.map(fm => {
              const name = fm.profile?.name ?? 'Участник';
              const selected = selectedFamilyIds.has(fm.user_id);
              return (
                <Pressable
                  key={fm.id}
                  onPress={() => toggleFamilyMember(fm.user_id)}
                  style={[styles.familyPickerRow, {
                    backgroundColor: selected ? colors.primary + '18' : colors.surface,
                    borderRadius: colors.radius - 4,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : 'transparent',
                  }]}
                >
                  <Avatar name={name} size={40} color={avatarColor(name)} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{name}</Text>
                    {fm.profile?.email && (
                      <Text style={[styles.memberCode, { color: colors.mutedForeground }]}>{fm.profile.email}</Text>
                    )}
                  </View>
                  <View style={[styles.checkbox, {
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderColor: selected ? colors.primary : colors.border,
                  }]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.familyModalFooter, { borderTopColor: colors.border, paddingBottom: 20 }]}>
            <Pressable
              onPress={handleAddFromFamily}
              disabled={selectedFamilyIds.size === 0 || addingFamily}
              style={[styles.familyAddBtn, {
                backgroundColor: selectedFamilyIds.size > 0 ? colors.primary : colors.muted,
                borderRadius: colors.radius,
                opacity: addingFamily ? 0.7 : 1,
              }]}
            >
              {addingFamily
                ? <ActivityIndicator color="#fff" />
                : (
                  <Text style={[styles.familyAddBtnText, {
                    color: selectedFamilyIds.size > 0 ? colors.primaryForeground : colors.mutedForeground,
                  }]}>
                    {selectedFamilyIds.size === 0
                      ? 'Выберите участников'
                      : `Добавить (${selectedFamilyIds.size})`
                    }
                  </Text>
                )
              }
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  memberName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  memberCode: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  removeBtn: { padding: 4 },
  emptyCard: {
    padding: 24, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  addCard: {
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  addHint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 0, overflow: 'hidden' },
  textInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 18, fontFamily: 'Inter_600SemiBold',
  },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', margin: 4 },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },

  // Family section
  familyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  familyIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  familyMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  familyPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  familyPickerBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // Role picker
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  roleSheet: { width: '100%', padding: 20, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  roleOption: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  roleOptionLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  roleOptionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  // Family modal
  familyModal: { flex: 1 },
  familyModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roleSelectorLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  roleToggleRow: { flexDirection: 'row', gap: 8 },
  roleToggleBtn: { paddingVertical: 10, alignItems: 'center' },
  roleToggleText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  familyPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  familyModalFooter: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  familyAddBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  familyAddBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
