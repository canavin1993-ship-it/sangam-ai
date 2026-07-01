
-- 1) Profiles: hide phone & phone_verified from general reads
REVOKE SELECT (phone, phone_verified) ON public.profiles FROM authenticated;
-- Owners can still read their own phone via a targeted policy-safe path:
-- we grant column SELECT back only when RLS matches auth.uid()=id via a view.
CREATE OR REPLACE VIEW public.my_contact WITH (security_invoker = true) AS
  SELECT id, phone, phone_verified FROM public.profiles WHERE id = auth.uid();
GRANT SELECT ON public.my_contact TO authenticated;

-- 2) Storage: replace overly-permissive read policy on profile-photos
DROP POLICY IF EXISTS "authenticated read profile photos" ON storage.objects;
CREATE POLICY "profile photos read owner or approved" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.photos p
        WHERE p.storage_path = storage.objects.name
          AND p.moderation = 'approved'
          AND p.is_private = false
      )
    )
  );

-- 3) Messages: add UPDATE (mark-read) and DELETE (own message) policies
CREATE POLICY "participants mark message read" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.profile_a = auth.uid() OR c.profile_b = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.profile_a = auth.uid() OR c.profile_b = auth.uid())
  ));

CREATE POLICY "sender deletes own message" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- 4) Realtime broadcast/presence: deny by default
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all broadcast presence" ON realtime.messages;
CREATE POLICY "deny all broadcast presence" ON realtime.messages
  FOR SELECT TO authenticated USING (false);

-- 5) SECURITY DEFINER hardening
-- 5a) has_role -> SECURITY INVOKER (user_roles RLS lets users read own roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 5b) get_active_tier: revoke from authenticated (only used server-side)
REVOKE EXECUTE ON FUNCTION public.get_active_tier(uuid) FROM authenticated;

-- 5c) open_conversation -> SECURITY INVOKER; needs INSERT policy on conversations
CREATE POLICY "participants insert conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_a OR auth.uid() = profile_b);

CREATE OR REPLACE FUNCTION public.open_conversation(_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
  mutual boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF me = _other THEN RAISE EXCEPTION 'cannot message self'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.interests i
    WHERE i.status = 'accepted'
      AND ((i.from_profile = me AND i.to_profile = _other)
        OR (i.from_profile = _other AND i.to_profile = me))
  ) INTO mutual;

  IF NOT mutual THEN RAISE EXCEPTION 'interest not accepted yet'; END IF;

  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;

  SELECT id INTO conv_id FROM public.conversations
    WHERE profile_a = a AND profile_b = b;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (profile_a, profile_b) VALUES (a, b)
      RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END $$;
