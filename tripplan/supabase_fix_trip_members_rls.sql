-- Allow trip owner to update role of any member in their trips
CREATE POLICY "Owner can update member roles" ON trip_members
  FOR UPDATE
  USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );
