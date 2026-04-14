import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { dateToISO, formatDateDMY, isoToDate, parseDateDMY } from '@/utils/date';
import { Button } from './Button';

interface DatePickerFieldProps {
  label: string;
  value: string; // ISO "YYYY-MM-DD"
  onChange: (iso: string) => void;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePickerField({ label, value, onChange, error, minDate, maxDate }: DatePickerFieldProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  // Temporary date while the user is picking (iOS confirms on button press)
  const [tempDate, setTempDate] = useState<Date>(value ? isoToDate(value) : new Date());
  // Web: text input state
  const [webText, setWebText] = useState(formatDateDMY(value));

  const selectedDate = value ? isoToDate(value) : new Date();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <View
          style={[
            styles.webInput,
            {
              backgroundColor: colors.surface,
              borderColor: error ? colors.destructive : colors.border,
              borderRadius: colors.radius - 4,
            },
          ]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginLeft: 12 }} />
          <TextInput
            value={webText}
            onChangeText={text => {
              setWebText(text);
              if (text.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                onChange(parseDateDMY(text));
              }
            }}
            placeholder="ДД.ММ.ГГГГ"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.webTextInput, { color: colors.foreground }]}
            keyboardType="numeric"
          />
        </View>
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      </View>
    );
  }

  // Android: inline spinner shown as dialog
  const handleAndroidChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (date) onChange(dateToISO(date));
  };

  // iOS: confirm via button
  const handleIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setTempDate(date);
  };

  const confirmIOS = () => {
    onChange(dateToISO(tempDate));
    setShowPicker(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>

      <Pressable
        onPress={() => {
          setTempDate(selectedDate);
          setShowPicker(true);
        }}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={[styles.triggerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value ? formatDateDMY(value) : 'ДД.ММ.ГГГГ'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
      </Pressable>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      {/* Android: renders directly (no modal needed) */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          onChange={handleAndroidChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}

      {/* iOS: render in a modal with confirm button */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
            <Pressable
              style={[styles.iosSheet, { backgroundColor: colors.surface }]}
              onPress={e => e.stopPropagation()}
            >
              <View style={[styles.iosHandle, { backgroundColor: colors.border }]} />
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleIOSChange}
                minimumDate={minDate}
                maximumDate={maxDate}
                locale="ru-RU"
                style={{ width: '100%' }}
              />
              <View style={styles.iosBtns}>
                <Button title="Отмена" onPress={() => setShowPicker(false)} variant="ghost" style={{ flex: 1 }} />
                <Button title="Готово"  onPress={confirmIOS}                 style={{ flex: 1 }} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { marginBottom: 12 },
  label:    { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  trigger:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1,
  },
  triggerText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  error:    { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  // Web
  webInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  webTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  // iOS modal
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24, paddingHorizontal: 16 },
  iosHandle:{ width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  iosBtns:  { flexDirection: 'row', gap: 12, marginTop: 8 },
});
