-- ================================================================
-- Notifications feature
-- ================================================================
-- Types: 'trip_added' | 'trip_removed' | 'trip_cancelled'
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('trip_added', 'trip_removed', 'trip_cancelled')),
  trip_id      text,
  trip_title   text NOT NULL DEFAULT '',
  message      text NOT NULL,
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Any authenticated user can insert (needed for cross-user notifications)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can mark their own as read or delete
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
