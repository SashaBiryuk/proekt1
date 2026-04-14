-- ═══════════════════════════════════════════════════════════════
-- UGC: User-Generated Guide Articles & Routes
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) User Guide Articles
CREATE TABLE IF NOT EXISTS user_guides (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL DEFAULT '',
  category    text NOT NULL CHECK (category IN ('city','nature','culture','food','practical')),
  flag        text NOT NULL DEFAULT '📍',
  title       text NOT NULL,
  subtitle    text NOT NULL DEFAULT '',
  region      text NOT NULL DEFAULT '',
  rating      text NOT NULL DEFAULT '4.0',
  read_time   text NOT NULL DEFAULT '3 мин',
  description text NOT NULL DEFAULT '',
  highlights  jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections    jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- 2) User Routes
CREATE TABLE IF NOT EXISTS user_routes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL DEFAULT '',
  category    text NOT NULL CHECK (category IN ('beach','mountain','city','road','active','romantic')),
  flag        text NOT NULL DEFAULT '📍',
  title       text NOT NULL,
  subtitle    text NOT NULL DEFAULT '',
  region      text NOT NULL DEFAULT '',
  days        text NOT NULL DEFAULT '1–3',
  distance    text NOT NULL DEFAULT '',
  difficulty  text NOT NULL CHECK (difficulty IN ('лёгкий','средний','сложный')) DEFAULT 'средний',
  season      text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  highlights  text[] NOT NULL DEFAULT '{}',
  tips        text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_user_guides_category ON user_guides(category);
CREATE INDEX IF NOT EXISTS idx_user_guides_created  ON user_guides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_routes_category ON user_routes(category);
CREATE INDEX IF NOT EXISTS idx_user_routes_created  ON user_routes(created_at DESC);

-- 4) RLS — all authenticated users can read; authors can insert/update/delete own
ALTER TABLE user_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routes ENABLE ROW LEVEL SECURITY;

-- user_guides policies
CREATE POLICY "user_guides_select" ON user_guides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_guides_insert" ON user_guides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_guides_update" ON user_guides
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_guides_delete" ON user_guides
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- user_routes policies
CREATE POLICY "user_routes_select" ON user_routes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_routes_insert" ON user_routes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_routes_update" ON user_routes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_routes_delete" ON user_routes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5) Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ugc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_guides_updated
  BEFORE UPDATE ON user_guides
  FOR EACH ROW EXECUTE FUNCTION update_ugc_updated_at();

CREATE TRIGGER trg_user_routes_updated
  BEFORE UPDATE ON user_routes
  FOR EACH ROW EXECUTE FUNCTION update_ugc_updated_at();
