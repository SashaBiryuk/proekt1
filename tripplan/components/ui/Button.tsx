import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const colors = useColors();

  const bgColor: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    ghost: 'transparent',
    destructive: colors.destructive,
  };

  const textColor: Record<Variant, string> = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    ghost: colors.foreground,
    destructive: '#fff',
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor[variant], borderRadius: colors.radius },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        variant === 'secondary' && { borderWidth: 1.5, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
