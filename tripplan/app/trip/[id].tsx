import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { formatDateDMY } from '@/utils/date';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import { useAuth } from '@/contexts/AuthContext';
import { PlanView } from '@/components/trip/PlanView';
import { BudgetView } from '@/components/trip/BudgetView';
import { MembersTab } from '@/components/trip/MembersTab';
import { NotesTab } from '@/components/trip/NotesTab';
import { SavingsTab } from '@/components/trip/SavingsTab';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { MemberRole, Trip, TripStatus, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '@/types';

type TabId = 'overview' | 'notes' | 'plan' | 'budget' | 'savings' | 'members';

const ALL_TABS: { id: TabId; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'overview', icon: 'home-outline' },
  { id: 'notes',    icon: 'flag-outline' },
  { id: 'plan',     icon: 'list-outline' },
  { id: 'budget',   icon: 'wallet-outline' },
  { id: 'savings',  icon: 'heart-outline' },
  { id: 'members',  icon: 'people-outline' },
];

// Statuses that are set automatically and cannot be chosen manually
const AUTO_STATUSES: TripStatus[] = ['ongoing', 'completed'];
// Statuses where no further changes are allowed
const LOCKED_STATUSES: TripStatus[] = ['cancelled'];

// Manual status options (excludes auto-only)
const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'planning',  label: 'Планируется' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'postponed', label: 'Перенесена' },
  { value: 'cancelled', label: 'Отменена' },
];

function formatDate(dateStr: string): string {
  return formatDateDMY(dateStr);
}

function getDuration(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TripDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, updateTrip, deleteTrip, getUserRole, addNote, createTrip, getMembers, createNotification } = useTrips();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<MemberRole>('member');

  // Cancelled reason modal
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Postpone modal (reason + new dates)
  const [postponeModal, setPostponeModal] = useState(false);
  const [postponeReason, setPostponeReason] = useState('');
  const [postponeStart, setPostponeStart] = useState('');
  const [postponeEnd, setPostponeEnd] = useState('');
  const [savingPostpone, setSavingPostpone] = useState(false);

  const trip = trips.find(t => t.id === id);

  // Role
  useEffect(() => {
    if (!trip) return;
    getUserRole(trip.id, trip.owner_id).then(role => {
      setUserRole(role);
      if (role === 'viewer' && activeTab === 'savings') setActiveTab('overview');
    });
  }, [trip?.id]);

  // Auto-status: ongoing on start day, completed day after end
  useEffect(() => {
    if (!trip) return;
    if (trip.status === 'cancelled' || trip.status === 'postponed') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(trip.start_date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(trip.end_date);
    endDate.setHours(0, 0, 0, 0);

    const dayAfterEnd = new Date(endDate);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);

    if ((trip.status === 'planning' || trip.status === 'confirmed') && today >= startDate && today <= endDate) {
      updateTrip(trip.id, { status: 'ongoing' });
      addNote(trip.id, '🚀 Поездка началась! Статус автоматически изменён на «В пути»', 'system');
    } else if (trip.status === 'ongoing' && today >= dayAfterEnd) {
      updateTrip(trip.id, { status: 'completed' });
      addNote(trip.id, '✅ Поездка завершена!', 'system');
    }
  }, [trip?.id, trip?.status, trip?.start_date, trip?.end_date]);

  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const isOwner = profile?.id === trip.owner_id;
  const readOnly = userRole === 'viewer';
  const isLocked = LOCKED_STATUSES.includes(trip.status);
  const isPostponed = trip.status === 'postponed';
  const canChangeStatus = isOwner && !isLocked;
  const statusClickable = isOwner && !isLocked && !isPostponed;

  const TABS = ALL_TABS.filter(t => !(t.id === 'savings' && readOnly));
  const statusColor = TRIP_STATUS_COLORS[trip.status] ?? '#90CAF9';
  const duration = getDuration(trip.start_date, trip.end_date);

  // ── Status change helpers ──────────────────────────────────────────────────

  const handleStatusBadgePress = () => {
    if (!isOwner) return;
    if (isLocked) {
      Alert.alert('Статус заблокирован', 'Поездка отменена — статус нельзя изменить.');
      return;
    }
    if (isPostponed) {
      Alert.alert('Статус заблокирован', 'Поездка перенесена — статус нельзя изменить.');
      return;
    }
    setStatusModalVisible(true);
  };

  const handleChangeStatus = (newStatus: TripStatus) => {
    setStatusModalVisible(false);
    if (newStatus === trip.status) return;

    if (newStatus === 'postponed') {
      // Set tomorrow as default new start
      const tomorrow = new Date(trip.start_date);
      tomorrow.setDate(tomorrow.getDate() + 7);
      const newEnd = new Date(trip.end_date);
      newEnd.setDate(newEnd.getDate() + 7);
      setPostponeStart(toISODate(tomorrow));
      setPostponeEnd(toISODate(newEnd));
      setPostponeReason('');
      setPostponeModal(true);
    } else if (newStatus === 'cancelled') {
      setCancelReason('');
      setCancelModal(true);
    } else {
      applyStatusChange(newStatus, null);
    }
  };

  const applyStatusChange = async (newStatus: TripStatus, reason: string | null) => {
    await updateTrip(trip.id, { status: newStatus });
    const label = TRIP_STATUS_LABELS[newStatus] ?? newStatus;
    const noteContent = reason
      ? `🔄 Статус изменён на «${label}»\nПричина: ${reason}`
      : `🔄 Статус изменён на «${label}»`;
    await addNote(trip.id, noteContent, 'system');

    // Notify all members if trip was cancelled
    if (newStatus === 'cancelled') {
      try {
        const members = await getMembers(trip.id);
        await Promise.all(
          members
            .filter(m => m.user_id !== profile?.id)
            .map(m =>
              createNotification(
                m.user_id,
                'trip_cancelled',
                trip.id,
                trip.title,
                `Поездка «${trip.title}» была отменена`,
              ),
            ),
        );
      } catch (e) {
        console.warn('notify members on cancel error:', e);
      }
    }
  };

  const handleConfirmCancel = async () => {
    const reason = cancelReason.trim();
    if (!reason) { Alert.alert('Укажите причину отмены'); return; }
    setCancelModal(false);
    await applyStatusChange('cancelled', reason);
    setCancelReason('');
  };

  const handleConfirmPostpone = async () => {
    const reason = postponeReason.trim();
    if (!reason) { Alert.alert('Укажите причину переноса'); return; }
    if (!postponeStart || !postponeEnd) { Alert.alert('Укажите новые даты поездки'); return; }
    if (postponeStart > postponeEnd) { Alert.alert('Дата начала не может быть позже даты конца'); return; }

    setSavingPostpone(true);

    // 1. Mark original trip as postponed
    await applyStatusChange('postponed',
      `${reason}\nНовые даты: ${formatDate(postponeStart)} — ${formatDate(postponeEnd)}`);

    // 2. Create copy with new dates
    try {
      const { id: _id, owner_id: _ow, created_at: _ca, updated_at: _ua, _pending, ...rest } = trip;
      await createTrip({
        ...rest,
        title: `${trip.title} (перенос)`,
        start_date: postponeStart,
        end_date: postponeEnd,
        status: 'planning',
        saved_amount: 0,
      });
    } catch {}

    setSavingPostpone(false);
    setPostponeModal(false);
  };

  // ── Delete / menu ──────────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      'Удалить поездку',
      `Вы уверены, что хотите удалить «${trip.title}»? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => { await deleteTrip(trip.id); router.back(); },
        },
      ],
    );
  };

  const handleMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Отмена', 'Редактировать', 'Изменить статус', 'Удалить'], destructiveButtonIndex: 3, cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) router.push(`/trip/edit?id=${trip.id}`);
          if (index === 2) handleStatusBadgePress();
          if (index === 3) handleDelete();
        },
      );
    } else {
      Alert.alert(trip.title, undefined, [
        { text: 'Редактировать', onPress: () => router.push(`/trip/edit?id=${trip.id}`) },
        { text: 'Изменить статус', onPress: handleStatusBadgePress },
        { text: 'Удалить поездку', style: 'destructive', onPress: handleDelete },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {trip.title}
        </Text>
        {isOwner ? (
          <Pressable onPress={handleMenu} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.heroRow}>
          {/* Status badge — clickable only if allowed */}
          {statusClickable ? (
            <TouchableOpacity
              onPress={handleStatusBadgePress}
              style={[styles.badge, { backgroundColor: statusColor }]}
              activeOpacity={0.75}
            >
              <Text style={styles.badgeText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
              <Ionicons name="chevron-down" size={11} color="#1A2332" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={isOwner ? handleStatusBadgePress : undefined}
              activeOpacity={isOwner ? 0.75 : 1}
              style={[styles.badge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.badgeText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
              {/* Lock icon for auto/locked statuses */}
              {isOwner && (isLocked || isPostponed || AUTO_STATUSES.includes(trip.status)) && (
                <Ionicons name="lock-closed" size={10} color="#1A2332" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.foreground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{duration} дней</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.foreground} />
          <Text style={[styles.location, { color: colors.foreground }]}>
            {trip.city}, {trip.country}
          </Text>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Начало</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>{formatDate(trip.start_date)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.foreground} />
          <View style={styles.dateItem}>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Конец</Text>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>{formatDate(trip.end_date)}</Text>
          </View>
        </View>
      </View>

      {/* Icon-only tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, active && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={active ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && <OverviewTab trip={trip} colors={colors} />}
        {activeTab === 'notes'    && <NotesTab tripId={trip.id} userRole={userRole} />}
        {activeTab === 'plan'     && <PlanView tripId={trip.id} readOnly={readOnly} />}
        {activeTab === 'budget'   && <BudgetView tripId={trip.id} trip={trip} readOnly={readOnly} />}
        {activeTab === 'savings'  && !readOnly && <SavingsTab trip={trip} />}
        {activeTab === 'members'  && <MembersTab tripId={trip.id} ownerId={trip.owner_id} userRole={userRole} />}
      </View>

      {/* ── Status picker modal ─────────────────────────────────────── */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: colors.radius }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Статус поездки</Text>

            {/* Info about auto statuses */}
            <View style={[styles.autoInfoBox, { backgroundColor: colors.primary + '15', borderRadius: colors.radius - 6 }]}>
              <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
              <Text style={[styles.autoInfoText, { color: colors.primary }]}>
                «В пути» и «Завершена» устанавливаются автоматически
              </Text>
            </View>

            {STATUS_OPTIONS.map(opt => {
              const isActive = trip.status === opt.value;
              const bg = TRIP_STATUS_COLORS[opt.value];
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleChangeStatus(opt.value)}
                  style={[
                    styles.statusRow,
                    { backgroundColor: isActive ? bg + '33' : 'transparent', borderRadius: 12 },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: bg }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.statusLabel,
                      { color: isActive ? colors.foreground : colors.mutedForeground,
                        fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' },
                    ]}>
                      {opt.label}
                    </Text>
                    {opt.value === 'postponed' && (
                      <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
                        Потребуется причина и новые даты
                      </Text>
                    )}
                    {opt.value === 'cancelled' && (
                      <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
                        Потребуется причина отмены
                      </Text>
                    )}
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color={colors.foreground} />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setStatusModalVisible(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Отмена</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Cancel reason modal ─────────────────────────────────────── */}
      <Modal
        visible={cancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCancelModal(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: colors.radius, gap: 12 }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Причина отмены</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              Причина будет добавлена в историю статусов поездки.
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              placeholder="Например: изменились планы..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.reasonInput, {
                color: colors.foreground, backgroundColor: colors.card,
                borderColor: colors.border, borderRadius: colors.radius - 4,
              }]}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setCancelModal(false)}
                style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCancel}
                style={[styles.cancelBtn, { flex: 1, backgroundColor: '#EF5350', borderRadius: colors.radius - 4 }]}
              >
                <Text style={[styles.cancelText, { color: '#fff' }]}>Отменить поездку</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Postpone modal (reason + new dates + copy) ─────────────── */}
      <Modal
        visible={postponeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPostponeModal(false)}
      >
        <View style={[styles.pageModal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.pageModalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setPostponeModal(false)} hitSlop={12}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
                Отмена
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 0 }]}>
              Перенос поездки
            </Text>
            <Pressable
              onPress={handleConfirmPostpone}
              disabled={savingPostpone}
              hitSlop={12}
            >
              {savingPostpone
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={{ color: colors.primary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                    Перенести
                  </Text>
              }
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.pageModalBody} keyboardShouldPersistTaps="handled">
            {/* Info */}
            <View style={[styles.autoInfoBox, { backgroundColor: colors.primary + '15', borderRadius: colors.radius - 4 }]}>
              <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
              <Text style={[styles.autoInfoText, { color: colors.primary }]}>
                Текущая поездка будет помечена как «Перенесена», а новая копия создана с указанными датами.
              </Text>
            </View>

            {/* Reason */}
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Причина переноса *</Text>
            <TextInput
              value={postponeReason}
              onChangeText={setPostponeReason}
              multiline
              placeholder="Например: сменился рабочий график..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.reasonInput, {
                color: colors.foreground, backgroundColor: colors.surface,
                borderColor: colors.border, borderRadius: colors.radius - 4,
              }]}
            />

            {/* New dates */}
            <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 8 }]}>
              Новые даты поездки *
            </Text>
            <DatePickerField
              label="Новая дата начала"
              value={postponeStart}
              onChange={setPostponeStart}
              minDate={new Date()}
            />
            <DatePickerField
              label="Новая дата окончания"
              value={postponeEnd}
              onChange={setPostponeEnd}
              minDate={postponeStart ? (() => { const d = new Date(postponeStart); d.setHours(0,0,0,0); return d; })() : new Date()}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function OverviewTab({ trip, colors }: { trip: Trip; colors: any }) {
  return (
    <ScrollView contentContainerStyle={styles.overviewContent} showsVerticalScrollIndicator={false}>
      {trip.description ? (
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Описание</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{trip.description}</Text>
        </View>
      ) : null}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>Детали поездки</Text>
        <InfoRow icon="location-outline"  label="Место"          value={`${trip.city}, ${trip.country}`} colors={colors} />
        <InfoRow icon="calendar-outline"  label="Дата начала"    value={formatDateDMY(trip.start_date)} colors={colors} />
        <InfoRow icon="calendar-outline"  label="Дата окончания" value={formatDateDMY(trip.end_date)}   colors={colors} />
        <InfoRow icon="flag-outline"      label="Статус"         value={TRIP_STATUS_LABELS[trip.status]} colors={colors} />
        {trip.budget != null && (
          <InfoRow icon="wallet-outline" label="Бюджет" value={`${trip.budget.toLocaleString('ru-RU')} ₽`} colors={colors} />
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, colors }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.foreground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}:</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'center' },

  heroCard: { padding: 16, borderBottomWidth: 1, gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, gap: 2,
  },
  badgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#1A2332' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location:    { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  datesRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateItem:    { gap: 2 },
  dateLabel:   { fontSize: 11, fontFamily: 'Inter_400Regular' },
  dateValue:   { fontSize: 13, fontFamily: 'Inter_500Medium' },

  // Icon-only tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},

  overviewContent: { padding: 16, gap: 12 },
  infoCard: {
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  infoTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  infoText:  { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', minWidth: 110 },
  infoValue: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { margin: 12, padding: 20, gap: 4 },
  modalHandle:  {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  modalTitle:   { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },

  autoInfoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, marginBottom: 8 },
  autoInfoText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 16 },

  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 12,
  },
  statusDot:   { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 15 },
  statusHint:  { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  cancelBtn:  { marginTop: 4, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },

  reasonInput: {
    borderWidth: 1, padding: 12,
    minHeight: 80, fontSize: 14,
    fontFamily: 'Inter_400Regular', textAlignVertical: 'top',
  },

  // Page-sheet modal (postpone)
  pageModal:       { flex: 1 },
  pageModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageModalBody: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 6 },
});
