import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/ui/Button';

export default function ConfirmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40),
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name="mail-outline" size={48} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        Подтвердите email
      </Text>

      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        Мы отправили письмо на{'\n'}
        <Text style={[styles.emailText, { color: colors.foreground }]}>
          {email ?? 'ваш email'}
        </Text>
        {'\n\n'}
        Перейдите по ссылке в письме, затем вернитесь и войдите в аккаунт.
      </Text>

      <Button
        title="Войти в аккаунт"
        onPress={() => router.replace('/auth/login')}
        fullWidth
        style={{ marginHorizontal: 32 }}
      />

      <TouchableOpacity
        onPress={() => router.replace('/auth/register')}
        style={styles.back}
      >
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>
          Зарегистрироваться с другим email
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    fontFamily: 'Inter_600SemiBold',
  },
  back: {
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
});
