import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { LoadingView } from '@/components/LoadingView';
import { useTrips } from '@/contexts/TripsContext';
import { Trip, TripStatus, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '@/types';
import { formatDateDMY } from '@/utils/date';

type SortKey = 'date' | 'budget';
type FilterStatus = TripStatus | 'all' | 'archived';

// Statuses hidden by default (shown only when explicitly filtered)
const ARCHIVED_STATUSES: TripStatus[] = ['cancelled', 'postponed'];

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',       label: 'Все' },
  { value: 'planning',  label: 'Планируется' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'active',    label: 'Активна' },
  { value: 'completed', label: 'Завершена' },
  { value: 'archived',  label: 'Архив' },
];

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function getDaysLabel(days: number): string {
  if (days < 0)  return 'Уже прошла';
  if (days === 0) return 'Сегодня!';
  if (days === 1) return 'Завтра!';
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod100 >= 11 && mod100 <= 19) return `Через ${days} дней`;
  if (mod10 === 1) return `Через ${days} день`;
  if (mod10 >= 2 && mod10 <= 4) return `Через ${days} дня`;
  return `Через ${days} дней`;
}

function getTripsWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'поездок';
  if (mod10 === 1) return 'поездка';
  if (mod10 >= 2 && mod10 <= 4) return 'поездки';
  return 'поездок';
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trips, loading, refreshing, fetchTrips } = useTrips();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  useEffect(() => { fetchTrips(); }, []);

  const handleTripPress = useCallback((trip: Trip) => {
    router.push(`/trip/${trip.id}`);
  }, []);

  const handleCreateTrip = useCallback(() => {
    router.push('/trip/create');
  }, []);

  const nearestTrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Only active trips for the top card — never cancelled or postponed
    const activeTrips = trips.filter(t => !ARCHIVED_STATUSES.includes(t.status as TripStatus));
    const upcoming = activeTrips
      .filter(t => t.status !== 'completed')
      .filter(t => new Date(t.start_date) >= today)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    if (upcoming.length > 0) return upcoming[0];
    const past = [...activeTrips].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    return past[0] ?? null;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    let list: Trip[];
    if (filterStatus === 'all') {
      // Default: hide cancelled and postponed
      list = trips.filter(t => !ARCHIVED_STATUSES.includes(t.status as TripStatus));
    } else if (filterStatus === 'archived') {
      // Archive filter: show only cancelled and postponed
      list = trips.filter(t => ARCHIVED_STATUSES.includes(t.status as TripStatus));
    } else {
      list = trips.filter(t => t.status === filterStatus);
    }
    if (sortKey === 'date') {
      list = [...list].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    } else {
      list = [...list].sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    }
    return list;
  }, [trips, filterStatus, sortKey]);

  if (loading && trips.length === 0) {
    return <LoadingView message="Загрузка поездок..." />;
  }

  const TAB_BAR_HEIGHT = 56;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* ─── TOP HALF: ближайшая поездка ───────────────── */}
      <View style={styles.topHalf}>
        {/* Header row */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Мои поездки</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              {(() => {
                const active = trips.filter(t => !ARCHIVED_STATUSES.includes(t.status as TripStatus));
                return active.length > 0 ? `${active.length} ${getTripsWord(active.length)}` : 'Планируйте вместе';
              })()}
            </Text>
          </View>
          <Pressable
            onPress={handleCreateTrip}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
              pressed && styles.fabPressed,
            ]}
            testID="create-trip-button"
          >
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Nearest trip card or empty */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.topContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTrips} tintColor={colors.primary} />}
        >
          {nearestTrip ? (
            <NearestTripCard
              trip={nearestTrip}
              colors={colors}
              onPress={() => handleTripPress(nearestTrip)}
            />
          ) : (
            <View style={[styles.emptyNear, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Ionicons name="airplane-outline" size={32} color={colors.primary} />
              <Text style={[styles.emptyNearTitle, { color: colors.foreground }]}>Нет поездок</Text>
              <Text style={[styles.emptyNearSub, { color: colors.mutedForeground }]}>
                Нажмите «Новая поездка», чтобы начать
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ─── Horizontal divider ──────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ─── BOTTOM HALF: все поездки + фильтры ─────────── */}
      <View style={styles.bottomHalf}>
        {/* Filters row */}
        <View style={styles.filtersBar}>
          {/* Status chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {STATUS_FILTERS.map(f => {
              const active = filterStatus === f.value;
              const chipColor = f.value === 'all' || f.value === 'archived'
                ? colors.primary
                : (TRIP_STATUS_COLORS[f.value as TripStatus] ?? colors.primary);
              const archivedCount = f.value === 'archived'
                ? trips.filter(t => ARCHIVED_STATUSES.includes(t.status as TripStatus)).length
                : 0;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFilterStatus(f.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? chipColor : colors.muted,
                      borderRadius: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? '#1A2332' : colors.mutedForeground }]}>
                    {f.label}
                  </Text>
                  {f.value === 'archived' && archivedCount > 0 && (
                    <View style={[styles.chipBadge, { backgroundColor: active ? 'rgba(0,0,0,0.15)' : colors.mutedForeground + '33' }]}>
                      <Text style={[styles.chipBadgeText, { color: active ? '#1A2332' : colors.mutedForeground }]}>
                        {archivedCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sort toggle */}
          <View style={[styles.sortToggle, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}>
            {(['date', 'budget'] as SortKey[]).map(k => (
              <Pressable
                key={k}
                onPress={() => setSortKey(k)}
                style={[
                  styles.sortBtn,
                  { borderRadius: colors.radius - 6 },
                  sortKey === k && { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons
                  name={k === 'date' ? 'calendar-outline' : 'wallet-outline'}
                  size={13}
                  color={sortKey === k ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[styles.sortBtnText, { color: sortKey === k ? colors.primaryForeground : colors.mutedForeground }]}>
                  {k === 'date' ? 'Дата' : 'Бюджет'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Trip list */}
        <FlatList
          data={filteredTrips}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <CompactTripCard
              trip={item}
              colors={colors}
              isNearest={item.id === nearestTrip?.id}
              onPress={() => handleTripPress(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTrips} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={[styles.emptyList, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Ionicons name="search-outline" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyListText, { color: colors.mutedForeground }]}>
                Нет поездок{filterStatus !== 'all' ? ' с таким фильтром' : ''}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

/* ─── Ближайшая поездка (большая карточка) ─── */
function NearestTripCard({ trip, colors, onPress }: { trip: Trip; colors: any; onPress: () => void }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status] ?? colors.primary;
  const days = getDaysUntil(trip.start_date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nearCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderLeftColor: colors.primary,
          borderLeftWidth: 4,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Title + status */}
      <View style={styles.nearTop}>
        <Text style={[styles.nearTitle, { color: colors.foreground }]} numberOfLines={1}>{trip.title}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
        </View>
      </View>

      {/* Days + meta row */}
      <View style={styles.nearRow}>
        <View style={[styles.daysTag, { backgroundColor: colors.primary + '1A', borderRadius: 10 }]}>
          <Ionicons name="timer-outline" size={13} color={colors.primary} />
          <Text style={[styles.daysText, { color: colors.primary }]}>{getDaysLabel(days)}</Text>
        </View>
        <View style={styles.metaGroup}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={colors.foreground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {trip.city}, {trip.country}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.foreground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatDateDMY(trip.start_date)} — {formatDateDMY(trip.end_date)}
            </Text>
          </View>
          {trip.budget != null && (
            <View style={styles.metaItem}>
              <Ionicons name="wallet-outline" size={12} color={colors.foreground} />
              <Text style={[styles.metaText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                {trip.budget.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
          )}
        </View>
      </View>

      {trip.description ? (
        <Text style={[styles.nearDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {trip.description}
        </Text>
      ) : null}

      <View style={[styles.openBtn, { backgroundColor: colors.primary + '18', borderRadius: colors.radius - 4 }]}>
        <Text style={[styles.openBtnText, { color: colors.primary }]}>Открыть поездку</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

/* ─── Компактная карточка списка ────────────── */
function CompactTripCard({
  trip, colors, isNearest, onPress,
}: {
  trip: Trip; colors: any; isNearest: boolean; onPress: () => void;
}) {
  const statusColor = TRIP_STATUS_COLORS[trip.status] ?? colors.muted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius - 2,
          borderLeftColor: isNearest ? colors.primary : statusColor,
          borderLeftWidth: 3,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.compactTop}>
          <Text style={[styles.compactTitle, { color: colors.foreground }]} numberOfLines={1}>{trip.title}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
          </View>
        </View>
        <Text style={[styles.compactMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {trip.city} · {formatDateDMY(trip.start_date)}
          {trip.budget != null ? ` · ${trip.budget.toLocaleString('ru-RU')} ₽` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.foreground} style={{ opacity: 0.35 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
  },

  /* Top half */
  topHalf: {
    flex: 4,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  topContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  /* Nearest card */
  nearCard: {
    padding: 14,
    gap: 10,
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  nearTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nearTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    flex: 1,
    letterSpacing: -0.3,
  },
  nearRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  daysTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  daysText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  metaGroup: {
    flex: 1,
    gap: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  nearDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  openBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },

  /* Empty near */
  emptyNear: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyNearTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyNearSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },

  /* FAB (inline button) */
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  fabText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },

  /* Horizontal divider */
  divider: {
    height: 1,
  },

  /* Bottom half */
  bottomHalf: {
    flex: 6,
  },

  /* Filters bar */
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
    paddingRight: 12,
  },
  filterChips: {
    paddingLeft: 16,
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  chipBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },

  /* Sort toggle */
  sortToggle: {
    flexDirection: 'row',
    padding: 3,
    flexShrink: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  sortBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  compactMeta: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },

  /* Empty list */
  emptyList: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  emptyListText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  /* Shared */
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#1A2332',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
