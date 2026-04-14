import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import { Trip } from '@/types';
import { Button } from '@/components/ui/Button';

interface SavingsTabProps {
  trip: Trip;
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

export function SavingsTab({ trip }: SavingsTabProps) {
  const colors = useColors();
  const { updateTrip, addNote } = useTrips();

  const budget = trip.budget ?? 0;
  const saved  = trip.saved_amount ?? 0;
  const progress = budget > 0 ? Math.min(saved / budget, 1) : 0;
  const remaining = Math.max(budget - saved, 0);

  const [inputValue, setInputValue] = useState(saved > 0 ? String(saved) : '');
  const [addValue, setAddValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'set' | 'add'>('set');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      friction: 6,
      tension: 40,
    }).start();
  }, [progress]);

  useEffect(() => {
    setInputValue(saved > 0 ? String(saved) : '');
  }, [saved]);

  const handleSave = async (newTotal: number) => {
    if (isNaN(newTotal) || newTotal < 0) return;
    setSaving(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    const wasGoalReached = budget > 0 && saved < budget && newTotal >= budget;
    await updateTrip(trip.id, { saved_amount: newTotal });
    if (wasGoalReached) {
      await addNote(
        trip.id,
        `🎉 Цель копилки достигнута! Собрано ${newTotal.toLocaleString('ru-RU')} ₽ из ${budget.toLocaleString('ru-RU')} ₽`,
        'system',
      );
    }
    setSaving(false);
    setAddValue('');
  };

  const handleSetAmount = () => {
    const val = parseFloat(inputValue);
    if (!isNaN(val)) handleSave(val);
  };

  const handleAddAmount = () => {
    const add = parseFloat(addValue);
    if (!isNaN(add) && add > 0) handleSave(saved + add);
  };

  const handleQuick = (amount: number) => {
    handleSave(saved + amount);
  };

  const progressColor = progress >= 1 ? '#4CAF50' : colors.primary;
  const progressBg    = progress >= 1 ? '#E8F5E9' : colors.card;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Platform.OS === 'web' ? 100 : 60 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Jar visual ── */}
      <Animated.View
        style={[
          styles.jarCard,
          { backgroundColor: progressBg, borderRadius: colors.radius, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Jar icon */}
        <View style={[styles.jarIconWrap, { backgroundColor: progressColor + '22' }]}>
          <Ionicons
            name={progress >= 1 ? 'checkmark-circle' : 'wallet'}
            size={40}
            color={progressColor}
          />
        </View>

        {progress >= 1 && (
          <Text style={[styles.goalReached, { color: '#4CAF50' }]}>Цель достигнута! 🎉</Text>
        )}

        {/* Main amount */}
        <Text style={[styles.savedAmount, { color: progressColor }]}>
          {saved.toLocaleString('ru-RU')} ₽
        </Text>
        <Text style={[styles.savedLabel, { color: colors.mutedForeground }]}>накоплено</Text>

        {/* Progress bar */}
        {budget > 0 && (
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: progressColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressPct, { color: progressColor }]}>
                {Math.round(progress * 100)}%
              </Text>
              <Text style={[styles.progressGoal, { color: colors.mutedForeground }]}>
                из {budget.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* ── Stats row ── */}
      {budget > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {budget.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Цель</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {saved.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Накоплено</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: remaining === 0 ? '#4CAF50' : colors.foreground }]}>
              {remaining.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Осталось</Text>
          </View>
        </View>
      )}

      {!budget && (
        <View style={[styles.noBudgetCard, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.noBudgetText, { color: colors.mutedForeground }]}>
            Укажите бюджет поездки (в разделе редактирования), чтобы видеть прогресс накоплений
          </Text>
        </View>
      )}

      {/* ── Mode toggle ── */}
      <View style={[styles.modeToggle, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}>
        <Pressable
          onPress={() => setMode('add')}
          style={[
            styles.modeBtn,
            mode === 'add' && { backgroundColor: colors.surface, borderRadius: colors.radius - 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
          ]}
        >
          <Text style={[styles.modeBtnText, { color: mode === 'add' ? colors.foreground : colors.mutedForeground }]}>
            + Пополнить
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('set')}
          style={[
            styles.modeBtn,
            mode === 'set' && { backgroundColor: colors.surface, borderRadius: colors.radius - 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
          ]}
        >
          <Text style={[styles.modeBtnText, { color: mode === 'set' ? colors.foreground : colors.mutedForeground }]}>
            Задать сумму
          </Text>
        </Pressable>
      </View>

      {/* ── Add mode ── */}
      {mode === 'add' && (
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.inputCardTitle, { color: colors.foreground }]}>Пополнить копилку</Text>
          <Text style={[styles.inputCardSub, { color: colors.mutedForeground }]}>
            На сколько пополнить?
          </Text>

          {/* Quick amounts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {QUICK_AMOUNTS.map(amt => (
              <Pressable
                key={amt}
                onPress={() => handleQuick(amt)}
                style={[styles.quickChip, { backgroundColor: colors.primary + '22', borderRadius: 20 }]}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>
                  +{amt.toLocaleString('ru-RU')} ₽
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.amtInputRow, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius - 4 }]}>
            <TextInput
              value={addValue}
              onChangeText={t => setAddValue(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="Своя сумма"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.amtInput, { color: colors.foreground }]}
              returnKeyType="done"
              onSubmitEditing={handleAddAmount}
            />
            <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>₽</Text>
          </View>

          <Button
            title={saving ? 'Сохранение...' : 'Пополнить'}
            onPress={handleAddAmount}
            loading={saving}
            fullWidth
            disabled={!addValue || isNaN(parseFloat(addValue)) || parseFloat(addValue) <= 0}
            style={{ marginTop: 4 }}
          />
        </View>
      )}

      {/* ── Set mode ── */}
      {mode === 'set' && (
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={[styles.inputCardTitle, { color: colors.foreground }]}>Задать накопленную сумму</Text>
          <Text style={[styles.inputCardSub, { color: colors.mutedForeground }]}>
            Введите общую сумму, которую вы накопили
          </Text>

          <View style={[styles.amtInputRow, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius - 4 }]}>
            <TextInput
              value={inputValue}
              onChangeText={t => setInputValue(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.amtInput, { color: colors.foreground }]}
              returnKeyType="done"
              onSubmitEditing={handleSetAmount}
            />
            <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>₽</Text>
          </View>

          {budget > 0 && inputValue && !isNaN(parseFloat(inputValue)) && (
            <Text style={[styles.previewPct, { color: parseFloat(inputValue) >= budget ? '#4CAF50' : colors.primary }]}>
              {Math.round(Math.min(parseFloat(inputValue) / budget, 1) * 100)}% от цели
              {parseFloat(inputValue) >= budget ? ' · Цель будет достигнута! 🎉' : ''}
            </Text>
          )}

          <Button
            title={saving ? 'Сохранение...' : 'Сохранить'}
            onPress={handleSetAmount}
            loading={saving}
            fullWidth
            disabled={!inputValue || isNaN(parseFloat(inputValue))}
            style={{ marginTop: 4 }}
          />

          {saved > 0 && (
            <Pressable
              onPress={() => { setInputValue('0'); handleSave(0); }}
              style={styles.resetBtn}
            >
              <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Сбросить копилку</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  jarCard: {
    alignItems: 'center',
    padding: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  jarIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  goalReached: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  savedAmount: { fontSize: 36, fontFamily: 'Inter_700Bold' },
  savedLabel:  { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -4 },

  progressSection: { width: '100%', gap: 6, marginTop: 4 },
  progressTrack: { height: 12, borderRadius: 6, overflow: 'hidden', width: '100%' },
  progressFill:  { height: '100%', borderRadius: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPct:  { fontSize: 14, fontFamily: 'Inter_700Bold' },
  progressGoal: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  statsRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  stat:      { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, height: 40, alignSelf: 'center' },

  noBudgetCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
  },
  noBudgetText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  modeToggle: {
    flexDirection: 'row', padding: 4, gap: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  inputCard: {
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  inputCardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  inputCardSub:   { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -4 },

  quickScroll: { marginHorizontal: -4 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4,
  },
  quickChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  amtInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, paddingHorizontal: 16,
  },
  amtInput: {
    flex: 1, fontSize: 26, fontFamily: 'Inter_700Bold',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  currencySymbol: { fontSize: 22, fontFamily: 'Inter_600SemiBold', marginLeft: 8 },

  previewPct: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  resetBtn: { alignItems: 'center', paddingVertical: 8 },
  resetText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
