CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS TABLE(verified_profiles bigint, total_profiles bigint, countries bigint, accepted_interests bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles WHERE is_verified = true AND status = 'active')::bigint,
    (SELECT count(*) FROM public.profiles WHERE status = 'active')::bigint,
    (SELECT count(DISTINCT country) FROM public.profiles WHERE country IS NOT NULL AND status = 'active')::bigint,
    (SELECT count(*) FROM public.interests WHERE status = 'accepted')::bigint;
$$;

REVOKE EXECUTE ON FUNCTION public.get_landing_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;