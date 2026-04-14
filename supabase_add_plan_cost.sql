-- Add cost column to trip_plan_items table
ALTER TABLE trip_plan_items
  ADD COLUMN IF NOT EXISTS cost numeric(12, 2);
