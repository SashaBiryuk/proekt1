import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTrips } from '@/contexts/TripsContext';
import { Trip, BudgetItem, BudgetCategory, BUDGET_CATEGORY_LABELS } from '@/types';
import { LoadingView } from '@/components/LoadingView';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface BudgetViewProps {
  tripId: string;
  trip: Trip;
  readOnly?: boolean;
}

const CATEGORIES: { value: BudgetCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'transport',     icon: 'airplane-outline' },
  { value: 'accommodation', icon: 'bed-outline' },
  { value: 'food',          icon: 'restaurant-outline' },
  { value: 'activities',    icon: 'ticket-outline' },
  { value: 'shopping',      icon: 'bag-outline' },
  { value: 'other',         icon: 'ellipsis-horizontal-circle-outline' },
];

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  transport:     '#90CAF9',
  accommodation: '#A5D6A7',
  food:          '#FFCC80',
  activities:    '#CE93D8',
  shopping:      '#FFCCBC',
  other:         '#B0BEC5',
};

export function BudgetView({ tripId, trip, readOnly = false }: BudgetViewProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getBudgetItems, addBudgetItem, deleteBudgetItem } = useTrips();

  const [items, setItems]     = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [newTitle, setNewTitle]       = useState('');
  const [newAmount, setNewAmount]     = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('other');

  const saved = trip.saved_amount ?? 0;
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const over  = saved > 0 && total > saved;

  useEffect(() => { loadItems(); }, [tripId]);

  const loadItems = async () => {
    setLoading(true);
    const data = await getBudgetItems(tripId);
    setItems(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newAmount.trim()) return;
    setSaving(true);
    const item = await addBudgetItem({
      trip_id: tripId,
      title: newTitle.trim(),
      amount: parseFloat(newAmount),
      category: newCategory,
    });
    setItems(prev => [item, ...prev]);
    setNewTitle(''); setNewAmount(''); setNewCategory('other');
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить', 'Удалить этот расход?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          setItems(prev => prev.filter(i => i.id !== id));
          await deleteBudgetItem(id);
        },
      },
    ]);
  };

  const getCatIcon = (cat: BudgetCategory) =>
    CATEGORIES.find(c => c.value === cat)?.icon ?? 'ellipsis-horizontal-circle-outline';

  if (loading) return <LoadingView message="Загрузка бюджета..." />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              {/* Накоплено row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="heart-outline" size={18} color={colors.foreground} />
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Накоплено</Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {saved.toLocaleString('ru-RU')} ₽
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              {/* Потрачено row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="receipt-outline" size={18} color={colors.foreground} />
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Потрачено</Text>
                </View>
                <Text style={[styles.summaryValue, { color: over ? '#EF5350' : colors.foreground }]}>
                  {total.toLocaleString('ru-RU')} ₽
                </Text>
              </View>

              {/* Остаток / перерасход */}
              {saved > 0 && (
                <View style={[styles.remainingBar, { backgroundColor: over ? '#FFEBEE' : '#E8F5E9', borderRadius: colors.radius - 6 }]}>
                  <Ionicons
                    name={over ? 'warning-outline' : 'trending-down-outline'}
                    size={14}
                    color={over ? '#EF5350' : '#4CAF50'}
                  />
                  <Text style={[styles.remainingText, { color: over ? '#EF5350' : '#4CAF50' }]}>
                    {over
                      ? `Перерасход на ${(total - saved).toLocaleString('ru-RU')} ₽`
                      : `Остаток: ${(saved - total).toLocaleString('ru-RU')} ₽`
                    }
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.budgetItem, { backgroundColor: colors.surface, borderRadius: colors.radius - 4 }]}>
            <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[item.category] + '33' }]}>
              <Ionicons name={getCatIcon(item.category)} size={20} color={CATEGORY_COLORS[item.category]} />
            </View>
            <View style={styles.budgetItemContent}>
              <Text style={[styles.budgetTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.budgetCategory, { color: colors.mutedForeground }]}>
                {BUDGET_CATEGORY_LABELS[item.category]}
              </Text>
            </View>
            <View style={styles.budgetRight}>
              <Text style={[styles.budgetAmount, { color: colors.foreground }]}>
                {item.amount.toLocaleString('ru-RU')} ₽
              </Text>
              {!readOnly && (
                <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Нет расходов" subtitle="Добавьте первый расход поездки" />
        }
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* FAB — hidden for viewers */}
      {!readOnly && (
        <Pressable
          onPress={() => setShowModal(true)}
          style={[
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 12,
            },
          ]}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Добавить расход</Text>
        </Pressable>
      )}

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Новый расход</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Input label="Название *" value={newTitle} onChangeText={setNewTitle} placeholder="Авиабилеты" autoFocus />
            <Input label="Сумма (₽) *" value={newAmount} onChangeText={setNewAmount} placeholder="5000" keyboardType="numeric" />
            <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>Категория</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.value}
                  onPress={() => setNewCategory(cat.value)}
                  style={[
                    styles.catOption,
                    {
                      backgroundColor: newCategory === cat.value ? colors.primary : colors.muted,
                      borderRadius: colors.radius - 4,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={18}
                    color={newCategory === cat.value ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text style={[
                    styles.catOptionText,
                    { color: newCategory === cat.value ? colors.primaryForeground : colors.mutedForeground },
                  ]}>
                    {BUDGET_CATEGORY_LABELS[cat.value]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button
              title="Добавить"
              onPress={handleAdd}
              loading={saving}
              fullWidth
              disabled={!newTitle.trim() || !newAmount.trim()}
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 90, flexGrow: 1 },

  summaryCard: {
    marginBottom: 12, padding: 14, gap: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  summaryDivider: { height: 1 },
  remainingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 6,
  },
  remainingText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  budgetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  budgetItemContent: { flex: 1 },
  budgetTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  budgetCategory: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  budgetRight: { alignItems: 'flex-end', gap: 4 },
  budgetAmount: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  addBtn: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#90CAF9', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 20, paddingTop: 24,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  modalBody: { paddingHorizontal: 20 },
  catLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  catOptionText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
