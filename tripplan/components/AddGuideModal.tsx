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
  { id: 'city', label: 'Город', icon: '🏙️' },
  { id: 'nature', label: 'Природа', icon: '🌿' },
  { id: 'culture', label: 'Культура', icon: '🎭' },
  { id: 'food', label: 'Кухня', icon: '🍽️' },
  { id: 'practical', label: 'Практика', icon: '💼' },
] as const;

const FLAG_OPTIONS = ['📍', '🏙️', '🌿', '🏔️', '🎭', '🍽️', '💼', '🌊', '✈️', '🗿', '🏛️', '⛪', '🕌', '🌅', '🌋', '❄️'];

const HIGHLIGHT_ICONS = ['🌤', '💰', '🏨', '🚇', '🍽️', '🎒', '⏱️', '📶', '🌡️', '🏖️', '⛰️', '🎭', '🛍️', '🚕', '💊', '🔌'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category: string;
    flag: string;
    title: string;
    subtitle: string;
    region: string;
    description: string;
    highlights: { icon: string; label: string; value: string }[];
    sections: { title: string; content: string }[];
    tags: string[];
  }) => Promise<void>;
}

interface HighlightInput {
  icon: string;
  label: string;
  value: string;
}

interface SectionInput {
  title: string;
  content: string;
}

export default function AddGuideModal({ visible, onClose, onSubmit }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState('city');
  const [flag, setFlag] = useState('📍');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [region, setRegion] = useState('');
  const [rating, setRating] = useState('4.5');
  const [readTime, setReadTime] = useState('5 мин');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFlags, setShowFlags] = useState(false);

  const [highlights, setHighlights] = useState<HighlightInput[]>([
    { icon: '🌤', label: 'Лучший сезон', value: '' },
    { icon: '💰', label: 'Бюджет/день', value: '' },
    { icon: '🏨', label: 'Жильё', value: '' },
    { icon: '🚇', label: 'Транспорт', value: '' },
  ]);

  const [sections, setSections] = useState<SectionInput[]>([
    { title: 'Что посмотреть', content: '' },
    { title: 'Транспорт', content: '' },
    { title: 'Где поесть', content: '' },
    { title: 'Жильё', content: '' },
    { title: 'Лайфхаки', content: '' },
  ]);

  const [showHighlightIcons, setShowHighlightIcons] = useState<number | null>(null);

  const updateHighlight = (idx: number, field: keyof HighlightInput, val: string) => {
    setHighlights(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  };

  const addHighlight = () => {
    setHighlights(prev => [...prev, { icon: '🎒', label: '', value: '' }]);
  };

  const removeHighlight = (idx: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSection = (idx: number, field: keyof SectionInput, val: string) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const addSection = () => {
    setSections(prev => [...prev, { title: '', content: '' }]);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setCategory('city');
    setFlag('📍');
    setTitle('');
    setSubtitle('');
    setRegion('');
    setRating('4.5');
    setReadTime('5 мин');
    setDescription('');
    setTagsText('');
    setShowFlags(false);
    setShowHighlightIcons(null);
    setHighlights([
      { icon: '🌤', label: 'Лучший сезон', value: '' },
      { icon: '💰', label: 'Бюджет/день', value: '' },
      { icon: '🏨', label: 'Жильё', value: '' },
      { icon: '🚇', label: 'Транспорт', value: '' },
    ]);
    setSections([
      { title: 'Что посмотреть', content: '' },
      { title: 'Транспорт', content: '' },
      { title: 'Где поесть', content: '' },
      { title: 'Жильё', content: '' },
      { title: 'Лайфхаки', content: '' },
    ]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Ошибка', 'Добавьте описание');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const filledHighlights = highlights.filter(h => h.label.trim() && h.value.trim());
      const filledSections = sections.filter(s => s.title.trim() && s.content.trim());

      await onSubmit({
        category,
        flag,
        title: title.trim(),
        subtitle: subtitle.trim(),
        region: region.trim(),
        description: description.trim(),
        highlights: filledHighlights,
        sections: filledSections,
        tags,
      });
      reset();
      onClose();
      Alert.alert('Готово!', 'Ваша статья добавлена и видна всем пользователям');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    }
    setSubmitting(false);
  };

  const inputStyle = [styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : 16, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Новая статья</Text>
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
          <TextInput value={title} onChangeText={setTitle} placeholder="Например: Казань" placeholderTextColor={colors.mutedForeground} style={inputStyle} />

          <Text style={[styles.label, { color: colors.foreground }]}>Подзаголовок</Text>
          <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="Столица Татарстана" placeholderTextColor={colors.mutedForeground} style={inputStyle} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>Регион</Text>
              <TextInput value={region} onChangeText={setRegion} placeholder="Россия, Татарстан" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
            </View>
            <View style={{ flex: 0.4 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>Рейтинг</Text>
              <TextInput value={rating} onChangeText={setRating} placeholder="4.5" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={inputStyle} />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Описание *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Расскажите об этом месте подробно..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
          />

          <View style={[styles.divider, { borderBottomColor: colors.border }]} />

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>📊 Информационные блоки</Text>
            <Pressable onPress={addHighlight} style={[styles.addBtn, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Добавить</Text>
            </Pressable>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Как на карточке Москвы: Лучший сезон, Бюджет/день, Жильё, Транспорт
          </Text>

          {highlights.map((h, idx) => (
            <View key={idx} style={[styles.highlightRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
              <View style={styles.highlightTopRow}>
                <Pressable onPress={() => setShowHighlightIcons(showHighlightIcons === idx ? null : idx)} style={styles.highlightIconBtn}>
                  <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                </Pressable>
                <TextInput
                  value={h.label}
                  onChangeText={v => updateHighlight(idx, 'label', v)}
                  placeholder="Название (напр. Бюджет/день)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.highlightInput, { color: colors.foreground, flex: 1 }]}
                />
                <Pressable onPress={() => removeHighlight(idx)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {showHighlightIcons === idx && (
                <View style={styles.iconPickerRow}>
                  {HIGHLIGHT_ICONS.map(ic => (
                    <Pressable key={ic} onPress={() => { updateHighlight(idx, 'icon', ic); setShowHighlightIcons(null); }} style={styles.iconPickerItem}>
                      <Text style={{ fontSize: 18 }}>{ic}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                value={h.value}
                onChangeText={v => updateHighlight(idx, 'value', v)}
                placeholder="Значение (напр. 3 000–5 000 ₽)"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.highlightValueInput, { color: colors.foreground, borderTopColor: colors.border }]}
              />
            </View>
          ))}

          <View style={[styles.divider, { borderBottomColor: colors.border }]} />

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>📖 Раскрывающиеся секции</Text>
            <Pressable onPress={addSection} style={[styles.addBtn, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Добавить</Text>
            </Pressable>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Что посмотреть, Транспорт, Где поесть, Жильё, Лайфхаки
          </Text>

          {sections.map((s, idx) => (
            <View key={idx} style={[styles.sectionBlock, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}>
              <View style={styles.sectionBlockHeader}>
                <TextInput
                  value={s.title}
                  onChangeText={v => updateSection(idx, 'title', v)}
                  placeholder="Заголовок секции"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.sectionTitleInput, { color: colors.foreground, flex: 1 }]}
                />
                <Pressable onPress={() => removeSection(idx)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <TextInput
                value={s.content}
                onChangeText={v => updateSection(idx, 'content', v)}
                placeholder="Содержание секции — подробное описание..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.sectionContentInput, { color: colors.foreground, borderTopColor: colors.border }]}
              />
            </View>
          ))}

          <View style={[styles.divider, { borderBottomColor: colors.border }]} />

          <Text style={[styles.label, { color: colors.foreground }]}>Теги (через запятую)</Text>
          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="столица, культура, метро, музеи"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
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
            Статья будет оформлена по шаблону и видна всем пользователям
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
  divider: { borderBottomWidth: 1, marginTop: 18, marginBottom: 6 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  helperText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  highlightRow: {
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  highlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  highlightInput: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  iconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  iconPickerItem: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  highlightValueInput: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sectionBlock: {
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  sectionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitleInput: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
  },
  sectionContentInput: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 70,
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
