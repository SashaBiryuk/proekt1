import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Button } from './ui/Button';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = 'Произошла ошибка', onRetry }: ErrorViewProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
      <Text style={[styles.text, { color: colors.foreground }]}>{message}</Text>
      {onRetry && (
        <Button title="Попробовать снова" onPress={onRetry} variant="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
