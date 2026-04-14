import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Route, CategoryId, Difficulty } from '@/data/routes-data';

export interface UserRouteRow {
  id: string;
  user_id: string;
  author_name: string;
  category: string;
  flag: string;
  title: string;
  subtitle: string;
  region: string;
  days: string;
  distance: string;
  difficulty: string;
  season: string;
  description: string;
  highlights: string[];
  tips: string;
  created_at: string;
}

function rowToRoute(row: UserRouteRow): Route {
  return {
    id: `ugc_route_${row.id}`,
    category: row.category as CategoryId,
    flag: row.flag,
    title: row.title,
    subtitle: row.subtitle,
    region: row.region,
    days: row.days,
    distance: row.distance,
    difficulty: row.difficulty as Difficulty,
    season: row.season,
    description: row.description,
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    tips: row.tips,
  };
}

export function useUserRoutes() {
  const [userRoutes, setUserRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_routes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setUserRoutes(data.map(rowToRoute));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addRoute = useCallback(async (input: {
    category: string;
    flag: string;
    title: string;
    subtitle: string;
    region: string;
    days: string;
    distance: string;
    difficulty: string;
    season: string;
    description: string;
    highlights: string[];
    tips: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Необходимо войти в аккаунт');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const { error } = await supabase.from('user_routes').insert({
      user_id: user.id,
      author_name: profile?.name || 'Пользователь',
      category: input.category,
      flag: input.flag,
      title: input.title,
      subtitle: input.subtitle,
      region: input.region,
      days: input.days,
      distance: input.distance,
      difficulty: input.difficulty,
      season: input.season,
      description: input.description,
      highlights: input.highlights,
      tips: input.tips,
    });

    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return { userRoutes, loading, refresh: fetchAll, addRoute };
}
