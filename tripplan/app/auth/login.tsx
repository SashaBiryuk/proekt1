import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset password modal
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetEmail(email.trim()); // prefill from login email if already typed
    setResetSent(false);
    setResetError('');
    setShowReset(true);
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) {
      setResetError('Введите ваш email');
      return;
    }
    setResetError('');
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (e: any) {
      setResetError('Не удалось отправить письмо. Проверьте email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.card, borderRadius: colors.radius + 4 }]}>
            <Ionicons name="airplane" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>ТрипПлан</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Совместное планирование поездок
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Вход в аккаунт</Text>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '22', borderRadius: colors.radius - 4 }]}>
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            testID="email-input"
          />

          <View>
            <Input
              label="Пароль"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              testID="password-input"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot password link */}
          <TouchableOpacity onPress={openReset} style={styles.forgotLink}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Забыли пароль?</Text>
          </TouchableOpacity>

          <Button
            title="Войти"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            testID="login-button"
            style={{ marginTop: 4 }}
          />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>или</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <Link href="/auth/register" asChild>
            <Button
              title="Создать аккаунт"
              onPress={() => {}}
              variant="secondary"
              fullWidth
              testID="register-link"
            />
          </Link>
        </View>
      </ScrollView>

      {/* Reset password modal */}
      <Modal
        visible={showReset}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReset(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Восстановление пароля</Text>
            <Pressable onPress={() => setShowReset(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {resetSent ? (
              /* Success state */
              <View style={styles.successBlock}>
                <View style={[styles.successIcon, { backgroundColor: '#A5D6A7' + '33' }]}>
                  <Ionicons name="mail-open-outline" size={40} color="#4CAF50" />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>
                  Письмо отправлено!
                </Text>
                <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                  Проверьте почту{'\n'}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                    {resetEmail}
                  </Text>
                  {'\n'}и перейдите по ссылке в письме, чтобы задать новый пароль.
                </Text>
                <Button
                  title="Закрыть"
                  onPress={() => setShowReset(false)}
                  fullWidth
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              /* Input state */
              <View>
                <View style={[styles.infoBlock, { backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    Введите email, привязанный к вашему аккаунту. Мы пришлём ссылку для сброса пароля.
                  </Text>
                </View>

                {resetError ? (
                  <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '22', borderRadius: colors.radius - 4, marginBottom: 12 }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{resetError}</Text>
                  </View>
                ) : null}

                <Input
                  label="Email"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                />

                <Button
                  title="Отправить ссылку"
                  onPress={handleReset}
                  loading={resetLoading}
                  fullWidth
                  disabled={!resetEmail.trim()}
                  style={{ marginTop: 8 }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  card: {
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 38,
    padding: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  line: { flex: 1, height: 1 },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBody: {
    padding: 20,
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },

  // Success
  successBlock: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 32,
    paddingHorizontal: 8,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
