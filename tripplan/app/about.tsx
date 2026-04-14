import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const APP_VERSION = '1.10.0';

const FEATURES = [
  { icon: 'people-outline',           text: 'Совместное планирование поездок' },
  { icon: 'calendar-outline',         text: 'План по дням с раскрывающимися секциями' },
  { icon: 'cash-outline',             text: 'Стоимость мероприятий в плане' },
  { icon: 'checkmark-done-outline',   text: 'Автозавершение прошедших пунктов плана' },
  { icon: 'wallet-outline',           text: 'Бюджет на основе накопленной суммы' },
  { icon: 'heart-outline',            text: 'Копилка для накопления средств' },
  { icon: 'flag-outline',             text: 'История статусов и заметки о поездке' },
  { icon: 'person-add-outline',       text: 'Приглашение участников по коду' },
  { icon: 'shield-checkmark-outline', text: 'Роли: владелец, участник, слушатель' },
  { icon: 'lock-closed-outline',      text: 'Автостатусы: В пути и Завершена' },
  { icon: 'cloud-offline-outline',    text: 'Работа без интернета (офлайн-кэш)' },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>О приложении</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + name */}
        <View style={styles.logoBlock}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="airplane" size={40} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>ТрипПлан</Text>
          <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
            Совместное планирование поездок
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.muted, borderRadius: 20 }]}>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
              Версия {APP_VERSION}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Что это?</Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            ТрипПлан — мобильное приложение для совместного планирования путешествий.
            Создавайте поездки, приглашайте друзей, составляйте план по дням с указанием
            стоимости мероприятий, отслеживайте статус поездки, контролируйте бюджет
            на основе накопленной суммы и копите деньги вместе — всё в одном месте.
          </Text>
        </View>

        {/* Features */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ВОЗМОЖНОСТИ</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          {FEATURES.map((f, i) => (
            <View key={i}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '18', borderRadius: 10 }]}>
                  <Ionicons name={f.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
              </View>
              {i < FEATURES.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Tech stack */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ТЕХНОЛОГИИ</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <View style={styles.techRow}>
            {['React Native', 'Expo', 'Supabase', 'TypeScript'].map(t => (
              <View key={t} style={[styles.techChip, { backgroundColor: colors.primary + '18', borderRadius: 20 }]}>
                <Text style={[styles.techText, { color: colors.primary }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Support */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ПОДДЕРЖКА</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL('mailto:support@tripplan.app')}
          >
            <Ionicons name="mail-outline" size={20} color={colors.foreground} />
            <Text style={[styles.linkText, { color: colors.foreground }]}>Написать в поддержку</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.foreground} style={{ opacity: 0.4 }} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL('https://tripplan.app/privacy')}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.foreground} />
            <Text style={[styles.linkText, { color: colors.foreground }]}>Политика конфиденциальности</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.foreground} style={{ opacity: 0.4 }} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL('https://tripplan.app/terms')}
          >
            <Ionicons name="shield-outline" size={20} color={colors.foreground} />
            <Text style={[styles.linkText, { color: colors.foreground }]}>Условия использования</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.foreground} style={{ opacity: 0.4 }} />
          </Pressable>
        </View>

        <Text style={[styles.copyright, { color: colors.mutedForeground }]}>
          © 2024–2026 ТрипПлан. Все права защищены.
        </Text>
      </ScrollView>
    </View>
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
    paddingTop: 24,
    gap: 8,
  },

  /* Logo block */
  logoBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },

  /* Cards */
  card: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
    marginLeft: 4,
  },

  /* Features */
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },

  /* Tech chips */
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  techText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  /* Links */
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },

  copyright: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
