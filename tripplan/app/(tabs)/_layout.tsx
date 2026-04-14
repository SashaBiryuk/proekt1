import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function TabLayout() {
  const { session } = useAuth();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Поездки',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Гид',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: 'Маршруты',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
