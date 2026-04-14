import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Trip, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '@/types';
import { formatDateDMY } from '@/utils/date';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const colors = useColors();
  const statusColor = TRIP_STATUS_COLORS[trip.status] ?? colors.muted;
  const statusLabel = TRIP_STATUS_LABELS[trip.status] ?? trip.status;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderRadius: colors.radius },
        pressed && styles.pressed,
      ]}
      testID={`trip-card-${trip.id}`}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {trip.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.foreground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {trip.city}, {trip.country}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.foreground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {formatDateDMY(trip.start_date)} — {formatDateDMY(trip.end_date)}
          </Text>
        </View>
      </View>

      {trip.description ? (
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {trip.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {trip.budget != null && (
          <View style={styles.metaRow}>
            <Ionicons name="wallet-outline" size={14} color={colors.foreground} />
            <Text style={[styles.budgetText, { color: colors.primary }]}>
              {trip.budget.toLocaleString('ru-RU')} ₽
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  header: { marginBottom: 10 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#1A2332',
  },
  meta: { gap: 5, marginBottom: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
