-- Interaction events: foundation for recommendation feedback and personalization.
-- interested/shortlisted are NOT duplicated here — they live in their own tables.

CREATE TABLE public.profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- text + CHECK over enum: extending is a constraint swap, no type surgery.
  event_type text NOT NULL CHECK (
    event_type IN ('viewed','profile_opened','dismissed','hidden','chat_started','match_created')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actor_id <> target_profile_id)
);

-- Suppression events are one-per-pair (upsertable); viewed/opened stay append-only.
CREATE UNIQUE INDEX profile_events_suppression_uniq
  ON public.profile_events (actor_id, target_profile_id, event_type)
  WHERE event_type IN ('dismissed','hidden');

CREATE INDEX profile_events_actor_recent
  ON public.profile_events (actor_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.profile_events TO authenticated;
GRANT ALL ON public.profile_events TO service_role;

ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;

-- Owner-only: create own, read own, delete own (undo dismiss/hide). No UPDATE.
CREATE POLICY "own events insert" ON public.profile_events
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "own events read" ON public.profile_events
  FOR SELECT TO authenticated USING (actor_id = auth.uid());
CREATE POLICY "own events delete" ON public.profile_events
  FOR DELETE TO authenticated USING (actor_id = auth.uid());
