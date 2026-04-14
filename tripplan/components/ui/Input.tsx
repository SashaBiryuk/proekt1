import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            color: colors.foreground,
            borderColor: error ? colors.destructive : focused ? colors.primary : colors.border,
            borderRadius: colors.radius - 4,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
});
