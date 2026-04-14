import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// In dev: process.env.EXPO_PUBLIC_* (Metro inlines them)
// In EAS native builds: Constants.expoConfig.extra (baked in via app.config.js)
const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra?.supabaseUrl as string) ||
  '';

const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
