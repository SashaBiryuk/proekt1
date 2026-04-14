import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { TripStatus, TRIP_STATUS_COLORS } from '@/types';

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'planning',  label: 'Планируется' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'ongoing',   label: 'В пути' },
  { value: 'postponed', label: 'Перенесена' },
  { value: 'cancelled', label: 'Отменена' },
];

export default function EditTripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, updateTrip } = useTrips();
  const { profile } = useAuth();

  const trip = trips.find(t => t.id === id);

  const [title, setTitle] = useState(trip?.title ?? '');
  const [description, setDescription] = useState(trip?.description ?? '');
  const [country, setCountry] = useState(trip?.country ?? '');
  const [city, setCity] = useState(trip?.city ?? '');
  const [startDate, setStartDate] = useState(trip?.start_date ?? '');
  const [endDate, setEndDate] = useState(trip?.end_date ?? '');
  const [budget, setBudget] = useState(trip?.budget != null ? String(trip.budget) : '');
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'planning');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!trip) {
    router.back();
    return null;
  }

  if (profile && profile.id !== trip.owner_id) {
    router.back();
    return null;
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim())   newErrors.title     = 'Введите название поездки';
    if (!country.trim()) newErrors.country   = 'Введите страну';
    if (!city.trim())    newErrors.city      = 'Введите город';
    if (!startDate)      newErrors.startDate = 'Выберите дату начала';
    if (!endDate)        newErrors.endDate   = 'Выберите дату окончания';
    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await updateTrip(trip.id, {
        title: title.trim(),
        description: description.trim(),
        country: country.trim(),
        city: city.trim(),
        start_date: startDate,
        end_date: endDate,
        status,
        budget: budget ? parseFloat(budget) : undefined,
      });
      router.back();
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить изменения. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.customHeader,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Редактировать поездку</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ОСНОВНОЕ</Text>
          <Input
            label="Название поездки *"
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Поездка в Барселону"
            error={errors.title}
          />
          <Input
            label="Описание"
            value={description}
            onChangeText={setDescription}
            placeholder="Добавьте описание поездки..."
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>МЕСТО</Text>
          <Input
            label="Страна *"
            value={country}
            onChangeText={setCountry}
            placeholder="Испания"
            error={errors.country}
          />
          <Input
            label="Город *"
            value={city}
            onChangeText={setCity}
            placeholder="Барселона"
            error={errors.city}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ДАТЫ</Text>
          <DatePickerField
            label="Дата начала *"
            value={startDate}
            onChange={setStartDate}
            error={errors.startDate}
          />
          <DatePickerField
            label="Дата окончания *"
            value={endDate}
            onChange={setEndDate}
            error={errors.endDate}
            minDate={startDate ? new Date(startDate) : undefined}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>БЮДЖЕТ И СТАТУС</Text>
          <Input
            label="Бюджет (₽)"
            value={budget}
            onChangeText={setBudget}
            placeholder="100000"
            keyboardType="numeric"
          />
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Статус</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map(opt => {
              const isSelected = status === opt.value;
              const statusColor = TRIP_STATUS_COLORS[opt.value];
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: isSelected ? statusColor : colors.muted,
                      borderRadius: colors.radius - 4,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.statusOptionText,
                    { color: isSelected ? '#1A2332' : colors.mutedForeground },
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title="Сохранить изменения"
          onPress={handleSave}
          loading={loading}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'center',
  },
  content:  { padding: 16, gap: 12 },
  section: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8 },
  statusOptionText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
