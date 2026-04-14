-- ================================================================
-- Extensions / Activation codes system
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Add plan fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2. Activation codes table
CREATE TABLE IF NOT EXISTS activation_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  plan          text NOT NULL,          -- 'premium' | 'vip'
  expires_at    timestamptz,            -- NULL = lifetime (бессрочно)
  redeemed_by   uuid REFERENCES profiles(id),
  redeemed_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- 3. RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read any code (needed to check validity)
DROP POLICY IF EXISTS "authenticated read codes" ON activation_codes;
CREATE POLICY "authenticated read codes"
  ON activation_codes FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update a code to redeem it (only if not redeemed yet)
DROP POLICY IF EXISTS "authenticated redeem codes" ON activation_codes;
CREATE POLICY "authenticated redeem codes"
  ON activation_codes FOR UPDATE
  TO authenticated
  USING (redeemed_by IS NULL)
  WITH CHECK (redeemed_by = auth.uid());

-- 4. Allow users to update their own plan in profiles
-- (The existing UPDATE policy should cover own rows; add it if missing)
DROP POLICY IF EXISTS "users update own profile plan" ON profiles;
CREATE POLICY "users update own profile plan"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 5. Sample codes for testing (remove in production)
-- INSERT INTO activation_codes (code, plan, expires_at) VALUES
--   ('PREMIUM2024', 'premium', NULL),
--   ('VIP2024',     'vip',     NULL),
--   ('PROMO30',     'premium', now() + interval '30 days');
