import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyGroup, FamilyMember } from '@/types';

type AddResult = 'ok' | 'not_found' | 'already_member' | 'error';

interface FamilyContextType {
  familyGroup: FamilyGroup | null;
  familyMembers: FamilyMember[];
  loadingFamily: boolean;
  familyError: string | null;
  createFamilyGroup: (name: string) => Promise<void>;
  updateGroupName: (name: string) => Promise<void>;
  addFamilyMember: (inviteCode: string) => Promise<AddResult>;
  removeFamilyMember: (memberId: string) => Promise<void>;
  reloadFamily: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [familyError, setFamilyError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFamily();
    } else {
      setFamilyGroup(null);
      setFamilyMembers([]);
      setFamilyError(null);
      setLoadingFamily(false);
    }
  }, [user?.id]);

  const loadFamily = async () => {
    if (!user) return;
    setLoadingFamily(true);
    setFamilyError(null);
    try {
      const { data: group, error: groupErr } = await supabase
        .from('family_groups')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (groupErr) {
        if (groupErr.code === '42P01') {
          setFamilyError('table_missing');
        } else {
          setFamilyError(groupErr.message);
        }
        setFamilyGroup(null);
        setFamilyMembers([]);
        setLoadingFamily(false);
        return;
      }

      if (!group) {
        setFamilyGroup(null);
        setFamilyMembers([]);
        setLoadingFamily(false);
        return;
      }

      setFamilyGroup(group as FamilyGroup);

      const { data: members, error: membersErr } = await supabase
        .from('family_members')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: true });

      if (membersErr) {
        console.warn('loadFamily members error:', membersErr.message);
        setFamilyMembers([]);
        setLoadingFamily(false);
        return;
      }

      if (members && members.length > 0) {
        const userIds = members.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, invite_code')
          .in('id', userIds);

        const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
        setFamilyMembers(
          members.map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) ?? null })),
        );
      } else {
        setFamilyMembers([]);
      }
    } catch (e: any) {
      console.warn('loadFamily error:', e);
      setFamilyError(e?.message ?? 'unknown');
    } finally {
      setLoadingFamily(false);
    }
  };

  const createFamilyGroup = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim() || 'Моя семья';
    const { data, error } = await supabase
      .from('family_groups')
      .insert({ owner_id: user.id, name: trimmed })
      .select()
      .single();
    if (error) {
      if (error.code === '42P01') throw new Error('table_missing');
      throw new Error(error.message);
    }
    setFamilyGroup(data as FamilyGroup);
    setFamilyMembers([]);
    setFamilyError(null);
  };

  const updateGroupName = async (name: string) => {
    if (!familyGroup) return;
    const trimmed = name.trim() || 'Моя семья';
    const { error } = await supabase
      .from('family_groups')
      .update({ name: trimmed })
      .eq('id', familyGroup.id);
    if (error) throw new Error(error.message);
    setFamilyGroup(prev => prev ? { ...prev, name: trimmed } : null);
  };

  const addFamilyMember = async (inviteCode: string): Promise<AddResult> => {
    if (!familyGroup || !user) return 'error';
    const code = inviteCode.trim().padStart(5, '0');

    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('invite_code', code)
        .maybeSingle();

      if (profileErr || !profile) return 'not_found';
      if (profile.id === user.id) return 'already_member';

      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('group_id', familyGroup.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) return 'already_member';

      const { error: insertErr } = await supabase
        .from('family_members')
        .insert({ group_id: familyGroup.id, user_id: profile.id });

      if (insertErr) {
        console.warn('addFamilyMember insert error:', insertErr.message);
        return 'error';
      }

      await loadFamily();
      return 'ok';
    } catch (e) {
      console.warn('addFamilyMember error:', e);
      return 'error';
    }
  };

  const removeFamilyMember = async (memberId: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', memberId);
    if (error) console.warn('removeFamilyMember error:', error.message);
    setFamilyMembers(prev => prev.filter(m => m.id !== memberId));
  };

  return (
    <FamilyContext.Provider value={{
      familyGroup,
      familyMembers,
      loadingFamily,
      familyError,
      createFamilyGroup,
      updateGroupName,
      addFamilyMember,
      removeFamilyMember,
      reloadFamily: loadFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamilyContext must be used within FamilyProvider');
  return ctx;
}
