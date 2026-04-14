import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PLAN_LABELS, PlanKey } from '@/types';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, user, signOut, refreshProfile } = useAuth();

  const inviteCode = profile?.invite_code ?? '—';
  const [codeCopied, setCodeCopied] = useState(false);

  // Extension info
  const planKey = profile?.plan ?? 'free';
  const planLabel = PLAN_LABELS[planKey] ?? 'Бесплатная';
  const planExpiry = (() => {
    if (planKey === 'free' || !profile?.plan_expires_at) return 'Бессрочно';
    try {
      const d = new Date(profile.plan_expires_at);
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return 'Бессрочно';
    }
  })();

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Extension modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);

  const handleRedeemCode = async () => {
    const trimmed = activationCode.trim().toUpperCase();
    if (!trimmed) { setCodeError('Введите код активации'); return; }
    if (!user) return;
    setCodeError('');
    setCodeSuccess('');
    setRedeemingCode(true);
    try {
      const { data: codeRow, error: fetchErr } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', trimmed)
        .is('redeemed_by', null)
        .single();

      if (fetchErr || !codeRow) {
        setCodeError('Код не найден или уже использован');
        setRedeemingCode(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from('activation_codes')
        .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
        .eq('id', codeRow.id)
        .is('redeemed_by', null);

      if (updateErr) {
        setCodeError('Не удалось активировать код. Попробуйте снова.');
        setRedeemingCode(false);
        return;
      }

      await supabase
        .from('profiles')
        .update({ plan: codeRow.plan, plan_expires_at: codeRow.expires_at ?? null })
        .eq('id', user.id);

      await refreshProfile();
      const planName = PLAN_LABELS[codeRow.plan as PlanKey] ?? codeRow.plan;
      setCodeSuccess(`Расширение «${planName}» успешно активировано!`);
      setActivationCode('');
      setShowCodeInput(false);
    } catch {
      setCodeError('Произошла ошибка. Попробуйте снова.');
    } finally {
      setRedeemingCode(false);
    }
  };

  // Delete account
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleCopyCode = async () => {
    if (!profile?.invite_code) return;
    try {
      await Clipboard.setStringAsync(profile.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Код скопирован', ToastAndroid.SHORT);
      }
    } catch {}
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    const trimNew = newPassword.trim();
    const trimConfirm = confirmPassword.trim();

    if (!trimNew) { setPasswordError('Введите новый пароль'); return; }
    if (trimNew.length < 6) { setPasswordError('Пароль должен быть не менее 6 символов'); return; }
    if (trimNew !== trimConfirm) { setPasswordError('Пароли не совпадают'); return; }

    setSavingPassword(true);
    try {
      // Re-authenticate first to verify current password
      const email = profile?.email ?? user?.email ?? '';
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError('Неверный текущий пароль');
        setSavingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: trimNew });
      if (error) {
        setPasswordError(error.message ?? 'Не удалось изменить пароль');
      } else {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Готово', 'Пароль успешно изменён');
      }
    } catch {
      setPasswordError('Произошла ошибка. Попробуйте снова.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт',
      'Это действие необратимо. Все ваши данные будут удалены. Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Подтверждение',
              'Введите «УДАЛИТЬ» для подтверждения',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Подтверждаю',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await supabase.rpc('delete_user');
                      await signOut();
                      router.replace('/auth/login');
                    } catch {
                      Alert.alert('Ошибка', 'Не удалось удалить аккаунт. Обратитесь в поддержку.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Код приглашения ──────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>МОЙ КОД</Text>
        <View style={[styles.card, { backgroundColor: colors.primary + '14', borderRadius: colors.radius, borderColor: colors.primary + '44', borderWidth: 1 }]}>
          <View style={styles.codeHeader}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={[styles.codeLabel, { color: colors.foreground }]}>Код для приглашений</Text>
          </View>
          <View style={styles.codeRow}>
            <Text style={[styles.codeValue, { color: colors.foreground }]}>{inviteCode}</Text>
            <Pressable
              onPress={handleCopyCode}
              hitSlop={10}
              style={[styles.copyBtn, { backgroundColor: codeCopied ? colors.primary : colors.surface, borderRadius: colors.radius - 6 }]}
            >
              <Ionicons
                name={codeCopied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={codeCopied ? colors.primaryForeground : colors.foreground}
              />
            </Pressable>
          </View>
          <Text style={[styles.codeHint, { color: colors.mutedForeground }]}>
            Сообщите этот код другу, чтобы он добавил вас в поездку
          </Text>
        </View>

        {/* ── Аккаунт ─────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>АККАУНТ</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <SettingsItem
            icon="lock-closed-outline"
            label="Изменить пароль"
            colors={colors}
            onPress={() => {
              setPasswordError('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordModal(true);
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            icon="mail-outline"
            label={user?.email ?? ''}
            sublabel="Email аккаунта"
            colors={colors}
            onPress={() => {}}
            disabled
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsItem
            icon="diamond-outline"
            label={planLabel}
            sublabel={`Расширение · ${planExpiry}`}
            colors={colors}
            onPress={() => {}}
            disabled
          />
        </View>

        {/* ── Подписка ─────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>РАСШИРЕНИЕ</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <SettingsItem
            icon="star-outline"
            label="Платное расширение"
            sublabel="Планы и возможности"
            colors={colors}
            onPress={() => setShowSubModal(true)}
          />
        </View>

        {/* ── Опасная зона ─────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ОПАСНАЯ ЗОНА</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
          >
            {deletingAccount
              ? <ActivityIndicator size="small" color={colors.destructive} />
              : <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            }
            <Text style={[styles.menuLabel, { color: colors.destructive, flex: 1 }]}>
              {deletingAccount ? 'Удаление...' : 'Удалить аккаунт'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Расширение (Modal) ──────────────────── */}
      <Modal
        visible={showSubModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowSubModal(false);
          setShowCodeInput(false);
          setActivationCode('');
          setCodeError('');
          setCodeSuccess('');
        }}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ width: 60 }} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Расширение</Text>
            <Pressable
              onPress={() => {
                setShowSubModal(false);
                setShowCodeInput(false);
                setActivationCode('');
                setCodeError('');
                setCodeSuccess('');
              }}
              hitSlop={12}
              style={{ width: 60, alignItems: 'flex-end' }}
            >
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.subContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.subHeadline, { color: colors.foreground }]}>
              Ваш план
            </Text>
            <Text style={[styles.subSubline, { color: colors.mutedForeground }]}>
              Активируйте код, чтобы получить расширенный доступ
            </Text>

            {/* Бесплатная */}
            <View style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: planKey === 'free' ? '#A5D6A7' : colors.border, borderWidth: planKey === 'free' ? 2 : 1 }]}>
              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="person-outline" size={22} color="#90CAF9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>Бесплатная</Text>
                  <Text style={[styles.planPrice, { color: colors.mutedForeground }]}>0 ₽</Text>
                </View>
                {planKey === 'free' && (
                  <View style={[styles.planBadge, { backgroundColor: '#A5D6A7' + '33' }]}>
                    <Text style={[styles.planBadgeText, { color: '#4CAF50' }]}>Активна</Text>
                  </View>
                )}
              </View>
              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />
              {[
                'До 20 активных поездок',
                'Базовое планирование по дням',
                'Учёт бюджета',
                'До 3 участников на поездку',
              ].map(f => (
                <View key={f} style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#A5D6A7" />
                  <Text style={[styles.planFeatureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Премиум */}
            <View style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: planKey === 'premium' ? '#A5D6A7' : '#90CAF9', borderWidth: planKey === 'premium' ? 2 : 1 }]}>
              {planKey !== 'premium' && (
                <View style={[styles.planPopularBanner, { backgroundColor: '#90CAF9' }]}>
                  <Ionicons name="flame" size={12} color="#fff" />
                  <Text style={styles.planPopularText}>Популярный</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: '#90CAF9' + '22' }]}>
                  <Ionicons name="star-outline" size={22} color="#90CAF9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>Премиум</Text>
                  <Text style={[styles.planPrice, { color: '#90CAF9' }]}>520 ₽ единоразово</Text>
                </View>
                {planKey === 'premium' && (
                  <View style={[styles.planBadge, { backgroundColor: '#A5D6A7' + '33' }]}>
                    <Text style={[styles.planBadgeText, { color: '#4CAF50' }]}>Активна</Text>
                  </View>
                )}
              </View>
              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />
              {[
                'Неограниченные поездки',
                'До 10 участников на поездку',
                'Семейная группа до 6 человек',
                'Копилка и расширенный бюджет',
                'Уведомления в реальном времени',
                'Базовый доступ к путеводителю',
                'Экспорт поездок в PDF',
              ].map(f => (
                <View key={f} style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#90CAF9" />
                  <Text style={[styles.planFeatureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>

            {/* VIP */}
            <View style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: planKey === 'vip' ? '#A5D6A7' : '#FFD700', borderWidth: planKey === 'vip' ? 2 : 1 }]}>
              {planKey !== 'vip' && (
                <View style={[styles.planPopularBanner, { backgroundColor: '#FFD700' }]}>
                  <Ionicons name="diamond" size={12} color="#fff" />
                  <Text style={styles.planPopularText}>Эксклюзив</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: '#FFF9C4' }]}>
                  <Ionicons name="diamond-outline" size={22} color="#F9A825" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>VIP</Text>
                  <Text style={[styles.planPrice, { color: '#F9A825' }]}>1 000 ₽ единоразово</Text>
                </View>
                {planKey === 'vip' && (
                  <View style={[styles.planBadge, { backgroundColor: '#A5D6A7' + '33' }]}>
                    <Text style={[styles.planBadgeText, { color: '#4CAF50' }]}>Активна</Text>
                  </View>
                )}
              </View>
              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />
              {[
                'Всё из Премиум',
                'Неограниченные участники',
                'Неограниченный доступ к путеводителю',
                'Эксклюзивные шаблоны маршрутов',
              ].map(f => (
                <View key={f} style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#F9A825" />
                  <Text style={[styles.planFeatureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>

            {/* ── Код активации ── */}
            {codeSuccess ? (
              <View style={[styles.codeSuccessBox, { backgroundColor: '#A5D6A7' + '22', borderRadius: colors.radius - 4 }]}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={[styles.codeSuccessText, { color: '#4CAF50' }]}>{codeSuccess}</Text>
              </View>
            ) : null}

            {showCodeInput ? (
              <View style={[styles.codeInputCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.codeInputLabel, { color: colors.foreground }]}>Код активации</Text>
                <View style={[styles.codeInputRow, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius - 4 }]}>
                  <TextInput
                    value={activationCode}
                    onChangeText={t => { setActivationCode(t); setCodeError(''); }}
                    placeholder="Введите код"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.codeInputField, { color: colors.foreground }]}
                  />
                </View>
                {codeError ? (
                  <View style={styles.codeErrRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
                    <Text style={[styles.codeErrText, { color: colors.destructive }]}>{codeError}</Text>
                  </View>
                ) : null}
                <View style={styles.codeActions}>
                  <Pressable
                    onPress={() => { setShowCodeInput(false); setActivationCode(''); setCodeError(''); }}
                    style={[styles.codeCancelBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}
                  >
                    <Text style={[styles.codeCancelText, { color: colors.mutedForeground }]}>Отмена</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRedeemCode}
                    disabled={redeemingCode}
                    style={[styles.codeSubmitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4, opacity: redeemingCode ? 0.6 : 1 }]}
                  >
                    {redeemingCode
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.codeSubmitText}>Активировать</Text>
                    }
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => { setShowCodeInput(true); setCodeSuccess(''); }}
                style={[styles.activationBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}
              >
                <Ionicons name="key-outline" size={18} color="#fff" />
                <Text style={styles.planBtnText}>Ввести код активации</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Смена пароля (Modal) ──────────────── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={12}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Отмена</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Изменить пароль</Text>
            <Pressable onPress={handleChangePassword} disabled={savingPassword} hitSlop={12}>
              {savingPassword
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.modalSave, { color: colors.primary }]}>Сохранить</Text>
              }
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <PasswordField
              label="Текущий пароль"
              value={currentPassword}
              onChangeText={t => { setCurrentPassword(t); setPasswordError(''); }}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(v => !v)}
              colors={colors}
            />
            <PasswordField
              label="Новый пароль"
              value={newPassword}
              onChangeText={t => { setNewPassword(t); setPasswordError(''); }}
              show={showNew}
              onToggleShow={() => setShowNew(v => !v)}
              colors={colors}
            />
            <PasswordField
              label="Повторите новый пароль"
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setPasswordError(''); }}
              show={showConfirm}
              onToggleShow={() => setShowConfirm(v => !v)}
              colors={colors}
            />

            {passwordError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '18', borderRadius: colors.radius - 4 }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{passwordError}</Text>
              </View>
            ) : null}

            <Text style={[styles.passwordHint, { color: colors.mutedForeground }]}>
              Пароль должен быть не менее 6 символов
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function PasswordField({
  label, value, onChangeText, show, onToggleShow, colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  show: boolean;
  onToggleShow: () => void;
  colors: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.fieldInput, { color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
          placeholder="••••••"
        />
        <Pressable onPress={onToggleShow} hitSlop={8} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function SettingsItem({
  icon, label, sublabel, colors, onPress, disabled, badge, badgeColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  colors: any;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.menuItem, pressed && !disabled && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={disabled ? colors.mutedForeground : colors.foreground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: disabled ? colors.mutedForeground : colors.foreground }]}>{label}</Text>
        {sublabel ? <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{sublabel}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badgePill, { backgroundColor: (badgeColor ?? colors.primary) + '22' }]}>
          <Text style={[styles.badgeText, { color: badgeColor ?? colors.primary }]}>{badge}</Text>
        </View>
      ) : (
        !disabled && <Ionicons name="chevron-forward" size={16} color={colors.foreground} style={{ opacity: 0.4 }} />
      )}
    </Pressable>
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
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 8,
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
    marginLeft: 4,
  },

  /* Invite code */
  card: {
    padding: 16,
    gap: 8,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeValue: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 10,
    flex: 1,
  },
  copyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },

  /* Menu */
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
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  menuSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },

  /* Password modal */
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalCancel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  modalSave: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginLeft: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  passwordHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  /* Subscription modal */
  subContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  subHeadline: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  subSubline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  subFooter: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },

  planCard: {
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  planPopularBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  planPopularText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  planPrice: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  planDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  planBtn: {
    marginTop: 6,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  planBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },

  activationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },

  codeSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  codeSuccessText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },

  codeInputCard: {
    padding: 16,
    gap: 12,
  },
  codeInputLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  codeInputRow: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  codeInputField: {
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 2,
  },
  codeErrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeErrText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  codeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  codeCancelText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  codeSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSubmitText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
