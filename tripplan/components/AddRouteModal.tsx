import { Ionicons } from '@expo/vector-icons';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const CATEGORY_OPTIONS = [
  { id: 'beach', label: 'Пляжный', icon: '🏖️' },
  { id: 'mountain', label: 'Горный', icon: '🏔️' },
  { id: 'city', label: 'Город', icon: '🏙️' },
  { id: 'road', label: 'Авто', icon: '🚗' },
  { id: 'active', label: 'Активный', icon: '🚴' },
  { id: 'romantic', label: 'Романтика', icon: '💑' },
] as const;

const DIFFICULTY_OPTIONS = [
  { id: 'лёгкий', label: 'Лёгкий', color: '#A5D6A7' },
  { id: 'средний', label: 'Средний', color: '#FFCC80' },
  { id: 'сложный', label: 'Сложный', color: '#EF9A9A' },
] as const;

const FLAG_OPTIONS = ['📍', '🌊', '🏔️', '🏙️', '🚗', '🚴', '💑', '🏖️', '✈️', '🗺️', '⛺', '🌅', '🚂', '🛤️', '🏕️', '⛷️'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category: string;
    flag: string;
    title: string;
    subtitle: string;
    region: string;
    days: string;
    distance: string;
    difficulty: string;
    season: string;
    description: string;
    highlights: string[];
    tips: string;
  }) => Promise<void>;
}

export default function AddRouteModal({ visible, onClose, onSubmit }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState('city');
  const [flag, setFlag] = useState('📍');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [region, setRegion] = useState('');
  const [days, setDays] = useState('');
  const [distance, setDistance] = useState('');
  const [difficulty, setDifficulty] = useState('средний');
  const [season, setSeason] = useState('');
  const [description, setDescription] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [tips, setTips] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFlags, setShowFlags] = useState(false);

  const reset = () => {
    setCategory('city');
    setFlag('📍');
    setTitle('');
    setSubtitle('');
    setRegion('');
    setDays('');
    setDistance('');
    setDifficulty('средний');
    setSeason('');
    setDescription('');
    setHighlightsText('');
    setTips('');
    setShowFlags(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название маршрута');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Ошибка', 'Добавьте описание маршрута');
      return;
    }

    setSubmitting(true);
    try {
      const highlights = highlightsText
        .split('\n')
        .map(h => h.trim())
        .filter(Boolean);

      await onSubmit({
        category,
        flag,
        title: title.trim(),
        subtitle: subtitle.trim(),
        region: region.trim(),
        days: days.trim() || '1–3',
        distance: distance.trim() || 'не указано',
        difficulty,
        season: season.trim() || 'Круглый год',
        description: description.trim(),
        highlights,
        tips: tips.trim(),
      });
      reset();
      onClose();
      Alert.alert('Готово!', 'Ваш маршрут добавлен и виден всем пользователям');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : 16, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Новый маршрут</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.foreground }]}>Категория</Text>
          <View style={styles.catRow}>
            {CATEGORY_OPTIONS.map(c => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === c.id ? colors.primary : colors.card,
                    borderColor: category === c.id ? colors.primary : colors.border,
                    borderRadius: 12,
                  },
                ]}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={[styles.catLabel, { color: category === c.id ? '#fff' : colors.foreground }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Иконка</Text>
          <Pressable onPress={() => setShowFlags(v => !v)} style={[styles.flagPicker, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
            <Text style={{ fontSize: 24 }}>{flag}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>
          {showFlags && (
            <View style={[styles.flagGrid, { backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border }]}>
              {FLAG_OPTIONS.map(f => (
                <Pressable key={f} onPress={() => { setFlag(f); setShowFlags(false); }} style={styles.flagItem}>
                  <Text style={{ fontSize: 22 }}>{f}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>Название *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Например: По Золотому кольцу"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Подзаголовок</Text>
          <TextInput
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Москва — Ярославль"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Регион</Text>
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="Центральная Россия"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>Дни</Text>
              <TextInput
                value={days}
                onChangeText={setDays}
                placeholder="5–7"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>Расстояние</Text>
              <TextInput
                value={distance}
                onChangeText={setDistance}
                placeholder="350 км"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Сложность</Text>
          <View style={styles.diffRow}>
            {DIFFICULTY_OPTIONS.map(d => (
              <Pressable
                key={d.id}
                onPress={() => setDifficulty(d.id)}
                style={[
                  styles.diffChip,
                  {
                    backgroundColor: difficulty === d.id ? d.color : colors.card,
                    borderColor: difficulty === d.id ? d.color : colors.border,
                    borderRadius: 12,
                  },
                ]}
              >
                <Text style={[styles.diffLabel, { color: difficulty === d.id ? '#fff' : colors.foreground }]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Сезон</Text>
          <TextInput
            value={season}
            onChangeText={setSeason}
            placeholder="Июнь — Сентябрь"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Описание *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Расскажите о маршруте..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Ключевые точки (каждая с новой строки)</Text>
          <TextInput
            value={highlightsText}
            onChangeText={setHighlightsText}
            placeholder={"Москва — Красная площадь\nСуздаль — кремль\nЯрославль — набережная"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Совет путешественнику</Text>
          <TextInput
            value={tips}
            onChangeText={setTips}
            placeholder="Полезный совет для тех, кто поедет..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12, minHeight: 80 }]}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: submitting ? 0.6 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Опубликовать</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Маршрут будет виден всем зарегистрированным пользователям
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  form: { padding: 16, gap: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 10 },
  row: { flexDirection: 'row', gap: 12 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  diffChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  diffLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  flagPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  flagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  flagItem: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  textArea: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    minHeight: 100,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 20,
  },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 10 },
});
