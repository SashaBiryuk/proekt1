import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Введите корректный email адрес');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, name.trim());
      // If email confirmation is required, result will be 'confirm'
      if (result === 'confirm') {
        setError('');
        setLoading(false);
        router.replace({ pathname: '/auth/confirm', params: { email: email.trim() } });
        return;
      }
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('already exists')) {
        setError('Этот email уже зарегистрирован');
      } else if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('429')) {
        setError('Слишком много попыток. Подождите немного и попробуйте снова.');
      } else if (msg.includes('invalid') && msg.includes('email')) {
        setError('Введите корректный email адрес');
      } else if (msg.includes('password') && (msg.includes('weak') || msg.includes('6'))) {
        setError('Пароль слишком простой. Используйте минимум 6 символов.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('NetworkError')) {
        setError('Нет соединения с сервером. Проверьте интернет.');
      } else if (msg.includes('signup_disabled') || msg.includes('Signups not allowed')) {
        setError('Регистрация временно недоступна.');
      } else {
        // Show the actual Supabase error so the user can report it
        setError(`Ошибка: ${msg || 'Попробуйте снова.'}`);
      }
    } finally {
      setLoading(false);
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
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Создать аккаунт</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Начните планировать поездки вместе
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '22', borderRadius: colors.radius - 4 }]}>
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Имя"
            value={name}
            onChangeText={setName}
            placeholder="Иван Иванов"
            autoCapitalize="words"
            testID="name-input"
          />

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
              placeholder="Минимум 6 символов"
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

          <Button
            title="Зарегистрироваться"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            testID="register-button"
            style={{ marginTop: 8 }}
          />
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={[styles.loginLinkText, { color: colors.mutedForeground }]}>
            Уже есть аккаунт?{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Войти</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  backRow: {
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  card: {
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
