-- Activation codes table for subscription management
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.activation_codes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text        NOT NULL UNIQUE,
  plan        text        NOT NULL CHECK (plan IN ('premium', 'vip')),
  expires_at  timestamptz,
  redeemed_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read codes (to check if code exists and is unredeemed)
CREATE POLICY "Authenticated users can read codes" ON public.activation_codes
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to update a code (to mark it as redeemed by them)
CREATE POLICY "Authenticated users can redeem codes" ON public.activation_codes
  FOR UPDATE TO authenticated
  USING (redeemed_by IS NULL)
  WITH CHECK (redeemed_by = auth.uid());

-- Ensure profiles table has plan and plan_expires_at columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'vip')),
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes (code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_redeemed_by ON public.activation_codes (redeemed_by);
