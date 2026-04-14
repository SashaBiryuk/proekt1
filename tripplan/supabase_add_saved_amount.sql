-- Add saved_amount column to trips table
-- Run this in Supabase → SQL Editor → New Query

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS saved_amount numeric(12, 2) DEFAULT 0;
