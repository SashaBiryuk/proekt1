import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { TripsProvider } from "@/contexts/TripsContext";
import { FamilyProvider } from "@/contexts/FamilyContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Inject CSS font on web — much faster than the JS font loader
if (Platform.OS === "web" && typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="trip/create" options={{ headerShown: false }} />
      <Stack.Screen name="trip/edit" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen name="family" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // On web, Inter is loaded via the CSS <link> above — pass an empty map so
  // useFonts never triggers fontfaceobserver (which times out in the iframe).
  // On native, load the four Inter weights normally.
  const [interLoaded, interError] = useFonts(
    Platform.OS === "web"
      ? {}
      : { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }
  );

  const isWeb = Platform.OS === "web";

  const [iconsLoaded, setIconsLoaded] = useState(isWeb); // web: immediately true
  // Safety valve: if native fonts don't load within 5s, unblock the app anyway
  const [fontTimeout, setFontTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isWeb) return; // web is already unblocked
    timeoutRef.current = setTimeout(() => setFontTimeout(true), 5000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Load Ionicons font explicitly on native only.
  // On web, @expo/vector-icons injects CSS itself; fontfaceobserver times out there.
  useEffect(() => {
    if (isWeb) return;
    Font.loadAsync({
      Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
    })
      .catch(() => {
        // Expo Go may have already registered this font — safe to ignore
      })
      .finally(() => setIconsLoaded(true));
  }, []);

  // On web: fonts are loaded by the CSS <link> — always ready immediately.
  // On native: wait for useFonts + Ionicons (with 5s timeout fallback).
  const fontsReady = isWeb || interLoaded || !!interError || fontTimeout;
  const iconsReady = isWeb || iconsLoaded || fontTimeout;
  const ready = fontsReady && iconsReady;

  useEffect(() => {
    if (ready) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <TripsProvider>
                <FamilyProvider>
                  <NotificationsProvider>
                    <RootLayoutNav />
                  </NotificationsProvider>
                </FamilyProvider>
              </TripsProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
