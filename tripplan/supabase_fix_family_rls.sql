-- ================================================================
-- Fix: infinite recursion in family_groups / family_members RLS
-- ================================================================
-- Root cause: family_groups_select referenced family_members,
-- and family_members_select referenced family_groups → circular loop.
-- Fix: family_groups_select checks ONLY owner_id (no cross-table ref).
-- ================================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "family_groups_select" ON family_groups;
DROP POLICY IF EXISTS "family_members_select" ON family_members;

-- family_groups: owner only sees their own group (no reference to family_members)
CREATE POLICY "family_groups_select" ON family_groups
  FOR SELECT USING (auth.uid() = owner_id);

-- family_members: the user themselves OR the group owner can see members
-- This is safe because family_groups_select no longer references family_members
CREATE POLICY "family_members_select" ON family_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id       = family_members.group_id
        AND family_groups.owner_id = auth.uid()
    )
  );
