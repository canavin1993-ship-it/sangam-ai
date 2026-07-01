
-- 1) Interests: replace permissive UPDATE policy with role-aware policies
DROP POLICY IF EXISTS "respond to interest" ON public.interests;

-- Recipient may change status to accepted/declined
CREATE POLICY "recipient responds to interest"
  ON public.interests FOR UPDATE
  TO authenticated
  USING (to_profile = auth.uid())
  WITH CHECK (to_profile = auth.uid() AND status IN ('accepted','declined'));

-- Sender may only withdraw their own request
CREATE POLICY "sender withdraws interest"
  ON public.interests FOR UPDATE
  TO authenticated
  USING (from_profile = auth.uid())
  WITH CHECK (from_profile = auth.uid() AND status = 'withdrawn');

-- 2) Profiles: prevent self-verification via trigger
CREATE OR REPLACE FUNCTION public.tg_guard_profile_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
    INTO is_staff;

  IF NOT COALESCE(is_staff, false) THEN
    -- Non-staff cannot modify verification/trust fields
    NEW.is_verified := OLD.is_verified;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_trust_fields ON public.profiles;
CREATE TRIGGER guard_profile_trust_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_guard_profile_trust_fields();
