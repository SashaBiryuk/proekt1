-- ================================================================
-- Family groups feature
-- ================================================================

-- Each user can own one family group
CREATE TABLE IF NOT EXISTS family_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Моя семья',
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_id)
);

-- Members of a family group (by user_id, not the owner themselves)
CREATE TABLE IF NOT EXISTS family_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ── RLS: family_groups ──────────────────────────────────────────
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

-- Owner sees their own group; members see the group they belong to
CREATE POLICY "family_groups_select" ON family_groups
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.group_id = family_groups.id
        AND family_members.user_id  = auth.uid()
    )
  );

CREATE POLICY "family_groups_insert" ON family_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "family_groups_update" ON family_groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "family_groups_delete" ON family_groups
  FOR DELETE USING (auth.uid() = owner_id);

-- ── RLS: family_members ─────────────────────────────────────────
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Group owner OR the member themselves can SELECT
CREATE POLICY "family_members_select" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id       = family_members.group_id
        AND family_groups.owner_id = auth.uid()
    ) OR auth.uid() = family_members.user_id
  );

-- Only group owner can INSERT
CREATE POLICY "family_members_insert" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id       = family_members.group_id
        AND family_groups.owner_id = auth.uid()
    )
  );

-- Only group owner can DELETE
CREATE POLICY "family_members_delete" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id       = family_members.group_id
        AND family_groups.owner_id = auth.uid()
    )
  );
