-- ================================================================
-- Trip retention policy
-- ================================================================
-- Rules:
--   cancelled / postponed → delete 30 days after status set
--   completed             → delete 1 year after status set
-- ================================================================

-- 1. Add status_changed_at column (tracks when status last changed)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now();

-- 2. Backfill: for existing cancelled/postponed use updated_at; for completed use updated_at
UPDATE trips
SET status_changed_at = COALESCE(updated_at, created_at, now())
WHERE status_changed_at IS NULL;

-- 3. Trigger function: update status_changed_at whenever status changes
CREATE OR REPLACE FUNCTION trips_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_status_change ON trips;
CREATE TRIGGER trg_trips_status_change
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trips_on_status_change();

-- ================================================================
-- 4. Cleanup function (can be called manually or via pg_cron)
-- ================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_trips()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM trips
  WHERE
    (status IN ('cancelled', 'postponed')
      AND status_changed_at < now() - INTERVAL '30 days')
    OR
    (status = 'completed'
      AND status_changed_at < now() - INTERVAL '1 year');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. Schedule daily cleanup with pg_cron (Supabase Pro required)
-- ================================================================
-- Uncomment the lines below if your Supabase plan has pg_cron:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.unschedule('cleanup_expired_trips') WHERE EXISTS (
--   SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_trips'
-- );
--
-- SELECT cron.schedule(
--   'cleanup_expired_trips',
--   '0 2 * * *',   -- every day at 02:00 UTC
--   $$ SELECT cleanup_expired_trips(); $$
-- );
--
-- ================================================================
-- If you are on the free plan, the app handles cleanup automatically
-- each time trips are loaded (lazy deletion). No extra setup needed.
-- ================================================================
