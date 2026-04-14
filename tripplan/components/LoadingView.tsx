import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = 'Загрузка...' }: LoadingViewProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
