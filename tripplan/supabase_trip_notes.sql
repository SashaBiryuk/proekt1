-- Trip notes table
CREATE TABLE IF NOT EXISTS trip_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     TEXT        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id),
  type        TEXT        NOT NULL DEFAULT 'manual' CHECK (type IN ('system', 'manual')),
  content     TEXT        NOT NULL,
  author_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS trip_notes_trip_id_idx ON trip_notes(trip_id);
CREATE INDEX IF NOT EXISTS trip_notes_created_at_idx ON trip_notes(created_at DESC);

-- RLS
ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

-- All trip members (owner + members) can view notes
CREATE POLICY "Trip members can view notes" ON trip_notes
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Only owner and member role can insert manual notes; system notes inserted by owner
CREATE POLICY "Owner and members can insert notes" ON trip_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role IN ('member')
    )
  );

-- Only the author or owner can delete manual notes
CREATE POLICY "Author or owner can delete notes" ON trip_notes
  FOR DELETE USING (
    auth.uid() = user_id OR
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );
