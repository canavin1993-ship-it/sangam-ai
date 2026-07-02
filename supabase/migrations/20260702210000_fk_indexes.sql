-- Production audit 2026-07-02: FK columns on hot query paths lacked covering
-- indexes. Cheap now, expensive to discover at scale.
CREATE INDEX IF NOT EXISTS idx_photos_profile ON public.photos (profile_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_profile ON public.shortlists (profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_profile_b ON public.matches (profile_b);
CREATE INDEX IF NOT EXISTS idx_events_target ON public.profile_events (target_profile_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports (reported_profile);
CREATE INDEX IF NOT EXISTS idx_conversations_b ON public.conversations (profile_b);
