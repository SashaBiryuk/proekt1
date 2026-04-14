import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/contexts/AuthContext';
import { useTrips } from '@/contexts/TripsContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/Button';
import { TRIP_STATUS_LABELS, TripStatus } from '@/types';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user, signOut, updateProfile } = useAuth();
  const { trips } = useTrips();
  const { unreadCount } = useNotifications();

  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'Пользователь';
  const email = profile?.email ?? user?.email ?? '';

  const statusCounts = trips.reduce((acc, trip) => {
    acc[trip.status] = (acc[trip.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleStartEdit = () => {
    setNameInput(displayName);
    setNameError('');
    setEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameError('');
    Keyboard.dismiss();
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Имя не может быть пустым');
      return;
    }
    if (trimmed === displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError('');
    try {
      await updateProfile({ name: trimmed });
      setEditingName(false);
      Keyboard.dismiss();
    } catch {
      setNameError('Не удалось сохранить. Попробуйте снова.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              router.replace('/auth/login');
            } catch {
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 56) + 20,
          paddingTop: insets.top + (Platform.OS === 'web' ? 16 : 8),
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Profile header row */}
      <View style={styles.profileHeader}>
        <Text style={[styles.profileTitle, { color: colors.foreground }]}>Профиль</Text>
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={12}
          style={[styles.bellBtn, { backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.bellBadgeText, { color: colors.primaryForeground }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Avatar + Name card */}
      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        {editingName ? (
          /* ── Edit mode ── */
          <View style={styles.editBlock}>
            <View
              style={[
                styles.nameInputRow,
                {
                  borderColor: nameError ? colors.destructive : colors.border,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                value={nameInput}
                onChangeText={t => { setNameInput(t); setNameError(''); }}
                style={[styles.nameInput, { color: colors.foreground }]}
                placeholder="Ваше имя"
                placeholderTextColor={colors.mutedForeground}
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                autoCorrect={false}
              />
            </View>

            {nameError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{nameError}</Text>
            ) : null}

            <View style={styles.editButtons}>
              <Pressable
                onPress={handleCancelEdit}
                style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                disabled={savingName}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4, opacity: savingName ? 0.7 : 1 }]}
              >
                {savingName
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Сохранить</Text>
                }
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── View mode ── */
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
              <Pressable onPress={handleStartEdit} hitSlop={10} style={styles.editIcon}>
                <Ionicons name="pencil-outline" size={17} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{email}</Text>
          </View>
        )}
      </View>


      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Статистика поездок</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{trips.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Всего</Text>
          </View>
          {Object.entries(statusCounts).slice(0, 2).map(([status, count]) => (
            <View key={status} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{count}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {TRIP_STATUS_LABELS[status as TripStatus] ?? status}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={[styles.menuCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
        <MenuItem
          icon="people-outline"
          label="Семейная группа"
          colors={colors}
          onPress={() => router.push('/family')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MenuItem
          icon="settings-outline"
          label="Настройки"
          colors={colors}
          onPress={() => router.push('/settings')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <MenuItem
          icon="information-circle-outline"
          label="О приложении"
          colors={colors}
          onPress={() => router.push('/about')}
        />
      </View>

      <Button
        title={signingOut ? 'Выход...' : 'Выйти из аккаунта'}
        onPress={handleSignOut}
        variant="destructive"
        loading={signingOut}
        fullWidth
        testID="sign-out-button"
      />
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.foreground} />
      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarCard: {
    alignItems: 'center',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  nameBlock: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  editIcon: {
    padding: 2,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  editBlock: {
    width: '100%',
    gap: 8,
    alignItems: 'stretch',
  },
  nameInputRow: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  nameInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  statsCard: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  menuCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  profileTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  bellBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
});
