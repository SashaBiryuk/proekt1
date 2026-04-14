import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import {
  PlanItem,
  PlanItemStatus,
  PLAN_ITEM_STATUS_COLORS,
  PLAN_ITEM_STATUS_LABELS,
} from '@/types';
import { formatDateDMY } from '@/utils/date';
import { LoadingView } from '@/components/LoadingView';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';

interface PlanViewProps {
  tripId: string;
  readOnly?: boolean;
}

const STATUS_OPTIONS: PlanItemStatus[] = ['planned', 'done', 'cancelled'];

/** Returns true if item's date/time has already passed — status should be locked as 'done' */
function isPastItem(item: PlanItem): boolean {
  if (!item.date) return false;
  const now = new Date();
  if (item.time) {
    const dt = new Date(`${item.date}T${item.time}`);
    return !isNaN(dt.getTime()) && dt <= now;
  } else {
    const d = new Date(`${item.date}T23:59:59`);
    return !isNaN(d.getTime()) && d <= now;
  }
}

/** Format "День N • DD.MM.YYYY" or just "День N" */
function dayHeader(day: number, date?: string): string {
  if (date) return `День ${day} • ${formatDateDMY(date)}`;
  return `День ${day}`;
}

export function PlanView({ tripId, readOnly = false }: PlanViewProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPlanItems, addPlanItem, updatePlanItem, deletePlanItem, addNote } = useTrips();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusItem, setStatusItem] = useState<PlanItem | null>(null);

  // Accordion state — set of expanded day numbers
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('1');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStatus, setNewStatus] = useState<PlanItemStatus>('planned');

  useEffect(() => { loadItems(); }, [tripId]);

  const loadItems = async () => {
    setLoading(true);
    const raw = await getPlanItems(tripId);
    const data = raw.map(i => ({ ...i, status: i.status ?? 'planned' }));

    // Auto-complete items whose date/time has passed
    const toComplete = data.filter(i => isPastItem(i) && i.status !== 'done' && i.status !== 'cancelled');
    const finalData = toComplete.length > 0
      ? data.map(i => toComplete.some(c => c.id === i.id) ? { ...i, status: 'done' as PlanItemStatus } : i)
      : data;

    if (toComplete.length > 0) {
      await Promise.all(toComplete.map(i => updatePlanItem(i.id, { status: 'done' })));
    }

    // Expand all days by default
    const days = [...new Set(finalData.map(i => i.day_number))];
    setExpandedDays(new Set(days));
    setItems(finalData);
    setLoading(false);
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const resetForm = () => {
    setNewTitle(''); setNewDay('1'); setNewDate('');
    setNewTime(''); setNewLocation(''); setNewDesc('');
    setNewCost(''); setNewStatus('planned');
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const dayNum = parseInt(newDay) || 1;
    const costVal = newCost.trim() ? parseFloat(newCost.replace(',', '.')) : undefined;
    const item = await addPlanItem({
      trip_id: tripId,
      day_number: dayNum,
      date: newDate || undefined,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      time: newTime.trim() || undefined,
      location: newLocation.trim() || undefined,
      cost: costVal,
      status: newStatus,
    });
    setItems(prev => {
      const updated = [...prev, { ...item, status: item.status ?? 'planned' }]
        .sort((a, b) => a.day_number - b.day_number);
      return updated;
    });
    // Expand the new day
    setExpandedDays(prev => new Set([...prev, dayNum]));

    // System note
    const parts = [`📋 Добавлен пункт плана: «${newTitle.trim()}» — День ${dayNum}`];
    if (newDate) parts.push(`Дата: ${formatDateDMY(newDate)}`);
    if (newTime.trim()) parts.push(`Время: ${newTime.trim()}`);
    if (newLocation.trim()) parts.push(`Место: ${newLocation.trim()}`);
    if (costVal !== undefined) parts.push(`Стоимость: ${costVal.toLocaleString('ru-RU')} ₽`);
    await addNote(tripId, parts.join('\n'), 'system');
    resetForm();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    const target = items.find(i => i.id === id);
    Alert.alert('Удалить', 'Удалить этот пункт плана?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          setItems(prev => prev.filter(i => i.id !== id));
          await deletePlanItem(id);
          if (target) {
            await addNote(
              tripId,
              `🗑️ Удалён пункт плана: «${target.title}» (День ${target.day_number})`,
              'system',
            );
          }
        },
      },
    ]);
  };

  const handleStatusChange = async (item: PlanItem, status: PlanItemStatus) => {
    if (isPastItem(item)) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    setStatusItem(null);
    await updatePlanItem(item.id, { status });
  };

  // Group items by day_number, preserving first date seen for the header
  const grouped = items.reduce((acc, item) => {
    const key = item.day_number;
    if (!acc[key]) acc[key] = { date: item.date, items: [] };
    if (!acc[key].date && item.date) acc[key].date = item.date;
    acc[key].items.push(item);
    return acc;
  }, {} as Record<number, { date?: string; items: PlanItem[] }>);

  const days = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  if (loading) return <LoadingView message="Загрузка плана..." />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={days}
        keyExtractor={d => String(d)}
        renderItem={({ item: day }) => {
          const { date, items: dayItems } = grouped[day];
          const isExpanded = expandedDays.has(day);
          const totalCost = dayItems.reduce((s, i) => s + (i.cost ?? 0), 0);

          return (
            <View style={styles.daySection}>
              {/* Collapsible day header */}
              <Pressable
                onPress={() => toggleDay(day)}
                style={[styles.dayHeader, { backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}
              >
                <View style={styles.dayHeaderLeft}>
                  <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.dayBadgeText, { color: colors.primaryForeground }]}>{day}</Text>
                  </View>
                  <View>
                    <Text style={[styles.dayLabel, { color: colors.foreground }]}>
                      {date ? formatDateDMY(date) : `День ${day}`}
                    </Text>
                    {date && (
                      <Text style={[styles.daySubLabel, { color: colors.mutedForeground }]}>
                        {dayItems.length} {dayItems.length === 1 ? 'пункт' : dayItems.length < 5 ? 'пункта' : 'пунктов'}
                        {totalCost > 0 ? ` • ${totalCost.toLocaleString('ru-RU')} ₽` : ''}
                      </Text>
                    )}
                    {!date && (
                      <Text style={[styles.daySubLabel, { color: colors.mutedForeground }]}>
                        {dayItems.length} {dayItems.length === 1 ? 'пункт' : dayItems.length < 5 ? 'пункта' : 'пунктов'}
                        {totalCost > 0 ? ` • ${totalCost.toLocaleString('ru-RU')} ₽` : ''}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {/* Plan items — shown when expanded */}
              {isExpanded && (
                <View style={styles.dayItems}>
                  {dayItems.map(plan => {
                    const statusColor = PLAN_ITEM_STATUS_COLORS[plan.status ?? 'planned'];
                    const isDone = plan.status === 'done';
                    const isCancelled = plan.status === 'cancelled';
                    return (
                      <View
                        key={plan.id}
                        style={[
                          styles.planItem,
                          {
                            backgroundColor: colors.surface,
                            borderRadius: colors.radius - 4,
                            borderLeftColor: statusColor,
                            opacity: isCancelled ? 0.6 : 1,
                          },
                        ]}
                      >
                        <View style={styles.planItemContent}>
                          <View style={styles.planItemHeader}>
                            {/* Status badge */}
                            {(() => {
                              const past = isPastItem(plan);
                              const interactive = !readOnly && !past;
                              return (
                                <Pressable
                                  onPress={interactive ? () => setStatusItem(plan) : undefined}
                                  style={[styles.statusBadge, { backgroundColor: statusColor + '33' }]}
                                  hitSlop={4}
                                >
                                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                  <Text style={[styles.statusBadgeText, { color: colors.foreground }]}>
                                    {PLAN_ITEM_STATUS_LABELS[plan.status ?? 'planned']}
                                  </Text>
                                  {past
                                    ? <Ionicons name="lock-closed" size={9} color={colors.mutedForeground} style={{ marginLeft: 2 }} />
                                    : (!readOnly && <Ionicons name="chevron-down" size={10} color={colors.mutedForeground} />)
                                  }
                                </Pressable>
                              );
                            })()}
                            {!readOnly && (
                              <Pressable onPress={() => handleDelete(plan.id)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                              </Pressable>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.planItemTitle,
                              { color: colors.foreground },
                              isDone && styles.strikethrough,
                            ]}
                          >
                            {plan.title}
                          </Text>

                          <View style={styles.metaRow}>
                            {plan.time ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                                <Text style={[styles.planMetaText, { color: colors.mutedForeground }]}>{plan.time}</Text>
                              </View>
                            ) : null}
                            {plan.location ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                                <Text style={[styles.planMetaText, { color: colors.mutedForeground }]}>{plan.location}</Text>
                              </View>
                            ) : null}
                            {plan.cost != null && plan.cost > 0 ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="cash-outline" size={12} color="#4CAF50" />
                                <Text style={[styles.planMetaText, { color: '#4CAF50', fontFamily: 'Inter_600SemiBold' }]}>
                                  {plan.cost.toLocaleString('ru-RU')} ₽
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {plan.description ? (
                            <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{plan.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="list-outline" title="План пуст" subtitle="Добавьте первый пункт маршрута" />
        }
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — hidden for viewers */}
      {!readOnly && (
        <Pressable
          onPress={() => setShowModal(true)}
          style={[
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 12,
            },
          ]}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Добавить пункт</Text>
        </Pressable>
      )}

      {/* Add item modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Новый пункт плана</Text>
            <Pressable onPress={() => { resetForm(); setShowModal(false); }}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Input
              label="Название *"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Посещение музея"
              autoFocus
            />
            <Input
              label="День №"
              value={newDay}
              onChangeText={setNewDay}
              placeholder="1"
              keyboardType="numeric"
            />
            <DatePickerField
              label="Дата"
              value={newDate}
              onChange={setNewDate}
            />
            <Input
              label="Время"
              value={newTime}
              onChangeText={setNewTime}
              placeholder="10:00"
            />
            <Input
              label="Место"
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="Прадо, Мадрид"
            />
            <Input
              label="Стоимость (₽)"
              value={newCost}
              onChangeText={setNewCost}
              placeholder="Оставьте пустым если бесплатно"
              keyboardType="numeric"
            />
            <Input
              label="Описание"
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Заметки..."
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />

            {/* Status picker */}
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Статус</Text>
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map(s => {
                const sc = PLAN_ITEM_STATUS_COLORS[s];
                const isActive = newStatus === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setNewStatus(s)}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: isActive ? sc : colors.muted,
                        borderRadius: colors.radius - 6,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      { color: isActive ? '#1A2332' : colors.mutedForeground },
                    ]}>
                      {PLAN_ITEM_STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              title="Добавить"
              onPress={handleAdd}
              loading={saving}
              fullWidth
              disabled={!newTitle.trim()}
              style={{ marginTop: 8, marginBottom: 32 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Status change bottom sheet */}
      <Modal
        visible={!!statusItem}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusItem(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setStatusItem(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Статус пункта</Text>
            {STATUS_OPTIONS.map(s => {
              const sc = PLAN_ITEM_STATUS_COLORS[s];
              const isActive = statusItem?.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => statusItem && handleStatusChange(statusItem, s)}
                  style={[
                    styles.sheetRow,
                    { backgroundColor: isActive ? sc + '33' : 'transparent', borderRadius: 12 },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: sc }]} />
                  <Text style={[
                    styles.sheetRowText,
                    {
                      color: colors.foreground,
                      fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    },
                  ]}>
                    {PLAN_ITEM_STATUS_LABELS[s]}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.foreground} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setStatusItem(null)}
              style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Отмена</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 90 },

  daySection: { marginBottom: 12 },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  dayLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  daySubLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },

  dayItems: { gap: 8, paddingLeft: 4 },

  planItem: {
    borderLeftWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  planItemContent: { padding: 12, gap: 6 },
  planItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  planItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planMetaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  planDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },

  addBtn: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  modal:       { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  modalBody:  { paddingHorizontal: 20 },
  statusLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 8 },
  statusOptions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8 },
  statusOptionText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    margin: 0,
    padding: 20,
    gap: 4,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  sheetRowText: { fontSize: 15 },
  cancelBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
