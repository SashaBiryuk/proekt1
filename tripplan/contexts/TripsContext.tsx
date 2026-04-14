import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BudgetItem, MemberRole, PlanItem, Trip, TripMember, TripNote } from '@/types';
import { useAuth } from './AuthContext';

const TRIPS_CACHE_KEY = '@tripplan_trips';

type InviteResult = 'ok' | 'not_found' | 'already_member' | 'error';

interface TripsContextType {
  trips: Trip[];
  loading: boolean;
  refreshing: boolean;
  fetchTrips: () => Promise<void>;
  createTrip: (data: Omit<Trip, 'id' | 'owner_id' | 'created_at' | 'updated_at' | '_pending'>) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  getPlanItems: (tripId: string) => Promise<PlanItem[]>;
  addPlanItem: (item: Omit<PlanItem, 'id' | 'created_at'>) => Promise<PlanItem>;
  updatePlanItem: (id: string, data: Partial<Pick<PlanItem, 'status'>>) => Promise<void>;
  deletePlanItem: (id: string) => Promise<void>;
  getBudgetItems: (tripId: string) => Promise<BudgetItem[]>;
  addBudgetItem: (item: Omit<BudgetItem, 'id' | 'created_at'>) => Promise<BudgetItem>;
  deleteBudgetItem: (id: string) => Promise<void>;
  getMembers: (tripId: string) => Promise<TripMember[]>;
  getUserRole: (tripId: string, ownerId: string) => Promise<MemberRole>;
  updateMemberRole: (memberId: string, role: 'member' | 'viewer') => Promise<boolean>;
  addMemberByCode: (tripId: string, code: string) => Promise<InviteResult>;
  addMemberById: (tripId: string, userId: string, role: MemberRole) => Promise<InviteResult>;
  removeMember: (memberId: string) => Promise<void>;
  createNotification: (userId: string, type: 'trip_added' | 'trip_removed' | 'trip_cancelled', tripId: string, tripTitle: string, message: string) => Promise<void>;
  getNotes: (tripId: string) => Promise<TripNote[]>;
  addNote: (tripId: string, content: string, type?: 'system' | 'manual') => Promise<TripNote | null>;
  deleteNote: (noteId: string) => Promise<void>;
}

const TripsContext = createContext<TripsContextType | undefined>(undefined);

/** RFC-4122 UUID v4 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toSupabase(trip: Trip): Record<string, unknown> {
  const { _pending, ...rest } = trip;
  return Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== null),
  );
}

async function saveCache(trips: Trip[]) {
  await AsyncStorage.setItem(TRIPS_CACHE_KEY, JSON.stringify(trips));
}

export function TripsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Trips ─────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);

    // Restore cache immediately for snappy UX
    let cachedTrips: Trip[] = [];
    try {
      const raw = await AsyncStorage.getItem(TRIPS_CACHE_KEY);
      if (raw) {
        cachedTrips = JSON.parse(raw);
        setTrips(cachedTrips);
      }
    } catch {}

    try {
      let allFetched: Trip[] = [];

      // ── Strategy 1: RPC function (bypasses RLS entirely — most robust) ──
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_trips');

      if (!rpcErr && Array.isArray(rpcData) && rpcData.length >= 0) {
        allFetched = rpcData as Trip[];
      } else {
        // ── Strategy 2: direct query fallback (works with simple RLS) ──
        if (rpcErr) console.warn('fetchTrips RPC error:', rpcErr.message);

        const { data: owned, error: ownedErr } = await supabase
          .from('trips')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (ownedErr) {
          console.warn('fetchTrips (owned) error:', ownedErr.message);
          // Stay with cached data — don't overwrite with empty
          return;
        }
        allFetched = owned as Trip[];

        // Also try member trips (optional — ignore errors)
        try {
          const { data: membership } = await supabase
            .from('trip_members')
            .select('trip_id')
            .eq('user_id', user.id);

          if (membership && membership.length > 0) {
            const ids = membership.map((m: any) => m.trip_id);
            const { data: mtrips } = await supabase
              .from('trips')
              .select('*')
              .in('id', ids);
            if (mtrips) allFetched = [...allFetched, ...(mtrips as Trip[])];
          }
        } catch {}
      }

      // De-duplicate by id
      const seen = new Set<string>();
      const deduped = allFetched.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      // Preserve locally pending trips not yet in Supabase
      const pending = cachedTrips.filter(t => t._pending === true);
      const supabaseIds = new Set(deduped.map(t => t.id));
      const stillPending = pending.filter(p => !supabaseIds.has(p.id));

      const merged: Trip[] = [...deduped, ...stillPending];
      merged.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );

      // ── Retention policy: lazy deletion of expired trips ──────────────────
      const now = Date.now();
      const THIRTY_DAYS_MS  = 30 * 24 * 60 * 60 * 1000;
      const ONE_YEAR_MS     = 365 * 24 * 60 * 60 * 1000;

      const expired = merged.filter(t => {
        if (t._pending) return false;
        const ref = t.status_changed_at ?? t.updated_at ?? t.created_at;
        if (!ref) return false;
        const age = now - new Date(ref).getTime();
        if ((t.status === 'cancelled' || t.status === 'postponed') && age > THIRTY_DAYS_MS) return true;
        if (t.status === 'completed' && age > ONE_YEAR_MS) return true;
        return false;
      });

      if (expired.length > 0) {
        // Fire-and-forget: delete expired trips from Supabase
        Promise.all(
          expired.map(t => supabase.from('trips').delete().eq('id', t.id).eq('owner_id', user.id)),
        ).catch(e => console.warn('cleanup_expired_trips error:', e));

        // Remove from local state immediately
        const expiredIds = new Set(expired.map(t => t.id));
        const cleaned = merged.filter(t => !expiredIds.has(t.id));
        setTrips(cleaned);
        await saveCache(cleaned);
      } else {
        setTrips(merged);
        await saveCache(merged);
      }

      if (stillPending.length > 0) syncPending(stillPending);
    } catch (e) {
      console.warn('fetchTrips error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const syncPending = async (pending: Trip[]) => {
    for (const trip of pending) {
      try {
        const { _pending, ...fields } = trip;
        const payload = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined && v !== null),
        );
        const { data, error } = await supabase
          .from('trips')
          .insert(payload)
          .select()
          .single();
        if (!error && data) {
          setTrips(prev => {
            const next = prev.map(t => t.id === trip.id ? (data as Trip) : t);
            saveCache(next);
            return next;
          });
        }
      } catch {}
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchTrips();
    } else {
      setTrips([]);
    }
  }, [user]);

  const createTrip = async (
    data: Omit<Trip, 'id' | 'owner_id' | 'created_at' | 'updated_at' | '_pending'>,
  ): Promise<Trip> => {
    if (!user) throw new Error('Пользователь не авторизован');
    const now = new Date().toISOString();
    const localTrip: Trip = {
      ...data,
      id: generateUUID(),
      owner_id: user.id,
      created_at: now,
      updated_at: now,
      _pending: true,
    };
    setTrips(prev => { const next = [localTrip, ...prev]; saveCache(next); return next; });

    try {
      const payload = toSupabase(localTrip);
      const { data: inserted, error } = await supabase
        .from('trips').insert(payload).select().single();
      if (error) throw error;
      const synced = inserted as Trip;
      setTrips(prev => {
        const next = prev.map(t => t.id === localTrip.id ? synced : t);
        saveCache(next);
        return next;
      });
      // System note: trip created
      try {
        const dateStr = new Date(now).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
        await supabase.from('trip_notes').insert({
          trip_id: synced.id,
          user_id: user.id,
          type: 'system',
          content: `📅 Поездка создана: ${dateStr}`,
          author_name: null,
        });
      } catch {}
      return synced;
    } catch (e: any) {
      console.warn('createTrip error (saved locally):', e?.message ?? e);
      return localTrip;
    }
  };

  const updateTrip = async (id: string, data: Partial<Trip>) => {
    const updated = { ...data, updated_at: new Date().toISOString() };
    setTrips(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updated } : t);
      saveCache(next);
      return next;
    });
    try {
      const { error } = await supabase.from('trips').update(updated).eq('id', id);
      if (error) console.warn('updateTrip error:', error.message);
    } catch (e) { console.warn('updateTrip error:', e); }
  };

  const deleteTrip = async (id: string) => {
    setTrips(prev => { const next = prev.filter(t => t.id !== id); saveCache(next); return next; });
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) console.warn('deleteTrip error:', error.message);
    } catch (e) { console.warn('deleteTrip error:', e); }
  };

  // ── Plan items ────────────────────────────────────────────

  const getPlanItems = async (tripId: string): Promise<PlanItem[]> => {
    const cacheKey = `@tripplan_plan_${tripId}`;
    const isPending = trips.find(t => t.id === tripId)?._pending;
    if (isPending) {
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
    try {
      const { data, error } = await supabase
        .from('trip_plan_items').select('*')
        .eq('trip_id', tripId).order('day_number', { ascending: true });
      if (error) throw error;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      return (data as PlanItem[]).map(i => ({ ...i, status: i.status ?? 'planned' }));
    } catch (e) {
      console.warn('getPlanItems error:', e);
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
  };

  const addPlanItem = async (item: Omit<PlanItem, 'id' | 'created_at'>): Promise<PlanItem> => {
    try {
      const { data, error } = await supabase.from('trip_plan_items').insert(item).select().single();
      if (error) throw error;
      return data as PlanItem;
    } catch (e: any) {
      console.warn('addPlanItem error:', e?.message ?? e);
      return { ...item, id: generateUUID(), created_at: new Date().toISOString() };
    }
  };

  const updatePlanItem = async (id: string, data: Partial<Pick<PlanItem, 'status'>>) => {
    try {
      const { error } = await supabase.from('trip_plan_items').update(data).eq('id', id);
      if (error) console.warn('updatePlanItem error:', error.message);
    } catch (e) { console.warn('updatePlanItem error:', e); }
  };

  const deletePlanItem = async (id: string) => {
    try {
      const { error } = await supabase.from('trip_plan_items').delete().eq('id', id);
      if (error) console.warn('deletePlanItem error:', error.message);
    } catch (e) { console.warn('deletePlanItem error:', e); }
  };

  // ── Budget items ──────────────────────────────────────────

  const getBudgetItems = async (tripId: string): Promise<BudgetItem[]> => {
    const cacheKey = `@tripplan_budget_${tripId}`;
    const isPending = trips.find(t => t.id === tripId)?._pending;
    if (isPending) {
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
    try {
      const { data, error } = await supabase
        .from('trip_budget_items').select('*')
        .eq('trip_id', tripId).order('created_at', { ascending: false });
      if (error) throw error;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      return data as BudgetItem[];
    } catch (e) {
      console.warn('getBudgetItems error:', e);
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
  };

  const addBudgetItem = async (item: Omit<BudgetItem, 'id' | 'created_at'>): Promise<BudgetItem> => {
    try {
      const { data, error } = await supabase.from('trip_budget_items').insert(item).select().single();
      if (error) throw error;
      return data as BudgetItem;
    } catch (e: any) {
      console.warn('addBudgetItem error:', e?.message ?? e);
      return { ...item, id: generateUUID(), created_at: new Date().toISOString() };
    }
  };

  const deleteBudgetItem = async (id: string) => {
    try {
      const { error } = await supabase.from('trip_budget_items').delete().eq('id', id);
      if (error) console.warn('deleteBudgetItem error:', error.message);
    } catch (e) { console.warn('deleteBudgetItem error:', e); }
  };

  // ── Members ───────────────────────────────────────────────

  const getMembers = async (tripId: string): Promise<TripMember[]> => {
    try {
      const { data: memberRows, error } = await supabase
        .from('trip_members')
        .select('id, trip_id, user_id, role, created_at')
        .eq('trip_id', tripId);

      if (error) throw error;
      if (!memberRows || memberRows.length === 0) return [];

      // Fetch profiles for all members (including invite_code for display)
      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, name, email, invite_code')
        .in('id', userIds);

      const profileMap: Record<string, any> = {};
      (profileRows ?? []).forEach((p: any) => { profileMap[p.id] = p; });

      return memberRows.map((m: any) => ({
        id: m.id,
        trip_id: m.trip_id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        profile: profileMap[m.user_id]
          ? {
              id: m.user_id,
              name: profileMap[m.user_id].name ?? '',
              email: profileMap[m.user_id].email ?? '',
              invite_code: profileMap[m.user_id].invite_code,
            }
          : undefined,
      }));
    } catch (e) {
      console.warn('getMembers error:', e);
      return [];
    }
  };

  const getUserRole = async (tripId: string, ownerId: string): Promise<MemberRole> => {
    if (!user) return 'viewer';
    if (user.id === ownerId) return 'owner';
    try {
      const { data } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();
      return (data?.role as MemberRole) ?? 'viewer';
    } catch {
      return 'viewer';
    }
  };

  const updateMemberRole = async (memberId: string, role: 'member' | 'viewer'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ role })
        .eq('id', memberId);
      if (error) {
        console.warn('updateMemberRole error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('updateMemberRole error:', e);
      return false;
    }
  };

  const getNotes = async (tripId: string): Promise<TripNote[]> => {
    try {
      const { data, error } = await supabase
        .from('trip_notes')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripNote[];
    } catch (e) {
      console.warn('getNotes error:', e);
      return [];
    }
  };

  const addNote = async (tripId: string, content: string, type: 'system' | 'manual' = 'manual'): Promise<TripNote | null> => {
    try {
      const authorName = user?.email?.split('@')[0] ?? 'Пользователь';
      const { data, error } = await supabase
        .from('trip_notes')
        .insert({
          trip_id: tripId,
          user_id: user?.id,
          type,
          content,
          author_name: type === 'manual' ? authorName : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TripNote;
    } catch (e) {
      console.warn('addNote error:', e);
      return null;
    }
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('trip_notes').delete().eq('id', noteId);
      if (error) console.warn('deleteNote error:', error.message);
    } catch (e) { console.warn('deleteNote error:', e); }
  };

  const createNotification = async (
    userId: string,
    type: 'trip_added' | 'trip_removed' | 'trip_cancelled',
    tripId: string,
    tripTitle: string,
    message: string,
  ): Promise<void> => {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        trip_id: tripId,
        trip_title: tripTitle,
        message,
      });
      if (error) console.warn('createNotification error:', error.message);
    } catch (e) {
      console.warn('createNotification error:', e);
    }
  };

  const addMemberByCode = async (tripId: string, code: string): Promise<InviteResult> => {
    try {
      const trimmedCode = code.trim().padStart(5, '0');

      // 1. Find profile by invite_code
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('invite_code', trimmedCode)
        .single();

      if (profileErr || !profileData) return 'not_found';

      // 2. Check if already a member
      const { data: existing } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (existing) return 'already_member';

      // 3. Insert member
      const { error: insertErr } = await supabase
        .from('trip_members')
        .insert({ trip_id: tripId, user_id: profileData.id, role: 'member' });

      if (insertErr) {
        console.warn('addMemberByCode insert error:', insertErr.message);
        return 'error';
      }

      // 4. Send notification to added user
      const trip = trips.find(t => t.id === tripId);
      const title = trip?.title ?? 'Поездка';
      await createNotification(
        profileData.id,
        'trip_added',
        tripId,
        title,
        `Вас добавили в поездку «${title}»`,
      );

      return 'ok';
    } catch (e) {
      console.warn('addMemberByCode error:', e);
      return 'error';
    }
  };

  const addMemberById = async (tripId: string, userId: string, role: MemberRole): Promise<InviteResult> => {
    try {
      const { data: existing } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) return 'already_member';
      const { error } = await supabase
        .from('trip_members')
        .insert({ trip_id: tripId, user_id: userId, role });
      if (error) { console.warn('addMemberById error:', error.message); return 'error'; }

      // Notify added user
      const trip = trips.find(t => t.id === tripId);
      const title = trip?.title ?? 'Поездка';
      await createNotification(
        userId,
        'trip_added',
        tripId,
        title,
        `Вас добавили в поездку «${title}»`,
      );

      return 'ok';
    } catch (e) { console.warn('addMemberById error:', e); return 'error'; }
  };

  const removeMember = async (memberId: string) => {
    try {
      // Fetch member info before deletion for notification
      const { data: memberInfo } = await supabase
        .from('trip_members')
        .select('user_id, trip_id')
        .eq('id', memberId)
        .single();

      const { error } = await supabase.from('trip_members').delete().eq('id', memberId);
      if (error) { console.warn('removeMember error:', error.message); return; }

      // Notify removed user (skip if self)
      if (memberInfo && memberInfo.user_id !== user?.id) {
        const trip = trips.find(t => t.id === memberInfo.trip_id);
        const title = trip?.title ?? 'Поездка';
        await createNotification(
          memberInfo.user_id,
          'trip_removed',
          memberInfo.trip_id,
          title,
          `Вас удалили из поездки «${title}»`,
        );
      }
    } catch (e) { console.warn('removeMember error:', e); }
  };

  return (
    <TripsContext.Provider value={{
      trips, loading, refreshing, fetchTrips,
      createTrip, updateTrip, deleteTrip,
      getPlanItems, addPlanItem, updatePlanItem, deletePlanItem,
      getBudgetItems, addBudgetItem, deleteBudgetItem,
      getMembers, getUserRole, updateMemberRole, addMemberByCode, addMemberById, removeMember, createNotification,
      getNotes, addNote, deleteNote,
    }}>
      {children}
    </TripsContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripsContext);
  if (!context) throw new Error('useTrips must be used within TripsProvider');
  return context;
}
