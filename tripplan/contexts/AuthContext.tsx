import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<'ok' | 'confirm'>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_CACHE_KEY = '@tripplan_profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (authUser: User) => {
    // 1. Restore cache for instant display
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) setProfile(JSON.parse(cached));
    } catch {}

    // 2. Build profile from auth metadata (always available)
    const meta = authUser.user_metadata ?? {};
    const baseProfile: Profile = {
      id: authUser.id,
      name: meta.name ?? meta.full_name ?? authUser.email?.split('@')[0] ?? 'Пользователь',
      email: authUser.email ?? '',
      invite_code: meta.invite_code,
    };

    // 3. Upsert to profiles table so other users can find this account by invite code
    try {
      const upsertData: Record<string, unknown> = {
        id: baseProfile.id,
        name: baseProfile.name,
        email: baseProfile.email,
      };
      if (baseProfile.invite_code) {
        upsertData.invite_code = baseProfile.invite_code;
      }
      await supabase.from('profiles').upsert(upsertData, { onConflict: 'id' });
    } catch {}

    // 4. Try to read back from table (may have richer data in future)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        return;
      }
    } catch {}

    // 5. Use base profile as final fallback
    setProfile(baseProfile);
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(baseProfile));
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string, name: string): Promise<'ok' | 'confirm'> => {
    // Generate a unique 5-digit invite code for this user
    const invite_code = Math.floor(Math.random() * 100000).toString().padStart(5, '0');

    // Store name and invite_code in user metadata — always works, no RLS needed
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, invite_code } },
    });
    if (error) throw new Error(error.message);

    // Optionally try to create a profiles row — silently ignore if RLS blocks it
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          email,
          invite_code,
          created_at: new Date().toISOString(),
        });
      } catch {
        // RLS may block this — the name is safe in user_metadata above
      }
    }

    // If session is null, Supabase requires email confirmation
    if (!data.session) {
      return 'confirm';
    }
    return 'ok';
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    await AsyncStorage.removeItem('@tripplan_trips');
    setProfile(null);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    // Update metadata first (always works)
    await supabase.auth.updateUser({ data: { name: data.name } });
    // Try table update silently
    try {
      await supabase.from('profiles').update(data).eq('id', user.id);
    } catch {
      // Ignore RLS errors
    }
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
