import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Real-time subscription
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newN = payload.new as Notification;
            setNotifications(prev => [newN, ...prev]);
          },
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setNotifications([]);
    }
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setNotifications(data as Notification[]);
      else if (error) console.warn('loadNotifications error:', error.message);
    } catch (e) {
      console.warn('loadNotifications error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;
    setNotifications([]);
    await supabase.from('notifications').delete().eq('user_id', user.id);
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, loading,
      loadNotifications, markAsRead, markAllAsRead,
      deleteNotification, clearAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
