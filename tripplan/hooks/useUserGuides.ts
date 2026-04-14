import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GuideArticle, GuideCategory } from '@/data/guide-data';

export interface UserGuideRow {
  id: string;
  user_id: string;
  author_name: string;
  category: string;
  flag: string;
  title: string;
  subtitle: string;
  region: string;
  rating: string;
  read_time: string;
  description: string;
  highlights: { icon: string; label: string; value: string }[];
  sections: { title: string; content: string }[];
  tags: string[];
  created_at: string;
}

function rowToArticle(row: UserGuideRow): GuideArticle {
  return {
    id: `ugc_guide_${row.id}`,
    category: row.category as GuideCategory,
    flag: row.flag,
    title: row.title,
    subtitle: row.subtitle,
    region: row.region,
    rating: row.rating,
    readTime: row.read_time,
    description: row.description,
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    sections: Array.isArray(row.sections) ? row.sections : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

export function useUserGuides() {
  const [userArticles, setUserArticles] = useState<GuideArticle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_guides')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setUserArticles(data.map(rowToArticle));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addGuide = useCallback(async (input: {
    category: string;
    flag: string;
    title: string;
    subtitle: string;
    region: string;
    description: string;
    highlights: { icon: string; label: string; value: string }[];
    sections: { title: string; content: string }[];
    tags: string[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Необходимо войти в аккаунт');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const { error } = await supabase.from('user_guides').insert({
      user_id: user.id,
      author_name: profile?.name || 'Пользователь',
      category: input.category,
      flag: input.flag,
      title: input.title,
      subtitle: input.subtitle,
      region: input.region,
      rating: '4.0',
      read_time: '5 мин',
      description: input.description,
      highlights: input.highlights,
      sections: input.sections,
      tags: input.tags,
    });

    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return { userArticles, loading, refresh: fetchAll, addGuide };
}
