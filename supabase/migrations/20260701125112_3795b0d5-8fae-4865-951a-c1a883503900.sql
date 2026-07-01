
-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_a, profile_b),
  CHECK (profile_a < profile_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read conversation" ON public.conversations
  FOR SELECT TO authenticated
  USING (profile_a = auth.uid() OR profile_b = auth.uid());

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.profile_a = auth.uid() OR c.profile_b = auth.uid())
  ));

CREATE POLICY "sender inserts message" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.profile_a = auth.uid() OR c.profile_b = auth.uid())
    )
  );

-- Bump conversations.last_message_at whenever a new message is inserted
CREATE OR REPLACE FUNCTION public.tg_bump_last_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_messages_bump AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_last_message();

-- Family members (parent mode)
CREATE TYPE public.family_role AS ENUM ('parent','sibling','relative','matchmaker');
CREATE TYPE public.family_status AS ENUM ('pending','accepted','revoked');

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  role public.family_role NOT NULL DEFAULT 'parent',
  status public.family_status NOT NULL DEFAULT 'pending',
  invited_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, member_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner or member read family" ON public.family_members
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR member_user_id = auth.uid());

CREATE POLICY "owner manages family" ON public.family_members
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "member updates own family status" ON public.family_members
  FOR UPDATE TO authenticated
  USING (member_user_id = auth.uid())
  WITH CHECK (member_user_id = auth.uid());

CREATE TRIGGER trg_family_updated_at BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helper to open/reuse a conversation when interests are mutual/accepted
CREATE OR REPLACE FUNCTION public.open_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

REVOKE ALL ON FUNCTION public.open_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_conversation(uuid) TO authenticated;

-- Realtime for messages + conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
