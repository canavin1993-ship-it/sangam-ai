-- Fix: compatibility cache never persisted. matches has GRANT INSERT/UPDATE for
-- authenticated but no RLS write policy, so every upsert from getCompatibility
-- was rejected and each request paid for a fresh model call.
-- Scope: participants may write only their own pair's row. Anon has no grants
-- on matches; service_role bypasses RLS. No DELETE policy — cache rows are
-- upserted, never removed by users.

CREATE POLICY "participants insert match" ON public.matches
  FOR INSERT TO authenticated
  WITH CHECK (profile_a = auth.uid() OR profile_b = auth.uid());

CREATE POLICY "participants update match" ON public.matches
  FOR UPDATE TO authenticated
  USING (profile_a = auth.uid() OR profile_b = auth.uid())
  WITH CHECK (profile_a = auth.uid() OR profile_b = auth.uid());
