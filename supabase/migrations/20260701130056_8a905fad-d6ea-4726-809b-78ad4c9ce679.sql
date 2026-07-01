
REVOKE EXECUTE ON FUNCTION public.get_active_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_tier(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.open_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_conversation(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
