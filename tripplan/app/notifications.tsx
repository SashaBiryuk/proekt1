import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Notification, NotificationType } from '@/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Только что';
  if (mins < 60) return `${mins} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 7)  return `${days} дн. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const TYPE_META: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  trip_added:     { icon: 'person-add',       color: '#A5D6A7', label: 'Добавлен в поездку' },
  trip_removed:   { icon: 'person-remove',    color: '#EF9A9A', label: 'Удалён из поездки' },
  trip_cancelled: { icon: 'close-circle',     color: '#FFCC80', label: 'Поездка отменена' },
};

function NotifCard({
  item, colors,
  onPress, onDelete,
}: {
  item: Notification;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.trip_added;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: item.read ? colors.surface : colors.card,
          borderRadius: colors.radius - 4,
          borderLeftWidth: 3,
          borderLeftColor: item.read ? colors.border : meta.color,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.color + '28', borderRadius: 22 }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: item.read ? colors.mutedForeground : colors.foreground }]}>
            {meta.label}
          </Text>
          {!item.read && (
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
          )}
        </View>
        <Text style={[styles.cardMessage, { color: colors.foreground }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
        <Ionicons name="close" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, loading, loadNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll, unreadCount } = useNotifications();

  const handlePress = useCallback(async (item: Notification) => {
    if (!item.read) await markAsRead(item.id);
    if (item.trip_id) {
      router.push(`/trip/${item.trip_id}`);
    }
  }, [markAsRead]);

  const hasNotifications = notifications.length > 0;

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Уведомления</Text>
          {unreadCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.headerBadgeText, { color: colors.primaryForeground }]}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {hasNotifications ? (
          <Pressable onPress={markAllAsRead} hitSlop={10} style={styles.actionBtn}>
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Прочитать все</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !hasNotifications ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderRadius: 40 }]}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Нет уведомлений</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Здесь появятся сообщения об изменениях в ваших поездках
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
            <NotifCard
              item={item}
              colors={colors}
              onPress={() => handlePress(item)}
              onDelete={() => deleteNotification(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasNotifications ? (
              <Pressable onPress={clearAll} style={[styles.clearBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                <Text style={[styles.clearBtnText, { color: colors.destructive }]}>Очистить все</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 80 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  headerBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  headerBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  actionBtn: { width: 80, alignItems: 'flex-end' },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },

  list: { padding: 16 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  cardMessage: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  cardTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  deleteBtn: { padding: 4, marginTop: 2 },

  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, marginTop: 16, borderWidth: 1,
  },
  clearBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
