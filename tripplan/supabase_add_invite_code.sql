-- Add invite_code column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate codes for existing users who don't have one
UPDATE profiles
SET invite_code = LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0')
WHERE invite_code IS NULL;

-- Ensure future codes are always unique (already covered by UNIQUE constraint above)
