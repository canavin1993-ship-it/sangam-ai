import { createServerFn } from "@tanstack/react-start";

export type LandingStats = {
  verifiedProfiles: number;
  totalProfiles: number;
  countries: number;
  acceptedInterests: number;
};

const ZERO_STATS: LandingStats = {
  verifiedProfiles: 0,
  totalProfiles: 0,
  countries: 0,
  acceptedInterests: 0,
};

export const getLandingStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingStats> => {
    // A public counter must never crash the homepage. If the admin client is
    // unavailable (missing SUPABASE_SERVICE_ROLE_KEY) or the query fails,
    // degrade to zeros instead of throwing a 500.
    try {
      return await computeLandingStats();
    } catch (e) {
      console.warn("[landing-stats] falling back to zeros:", e instanceof Error ? e.message : e);
      return ZERO_STATS;
    }
  },
);

type StatsRow = {
  verified_profiles: number;
  total_profiles: number;
  countries: number;
  accepted_interests: number;
};

async function computeLandingStats(): Promise<LandingStats> {
  // Uses the SECURITY DEFINER RPC public.get_landing_stats() (granted to anon),
  // so the publishable-key client is enough — no SUPABASE_SERVICE_ROLE_KEY needed.
  const { supabase } = await import("@/integrations/supabase/client");
  // Cast: the get_landing_stats RPC is newer than the generated Database types.
  const rpc = supabase.rpc as unknown as (
    name: string,
  ) => Promise<{ data: StatsRow[] | null; error: unknown }>;
  const { data, error } = await rpc("get_landing_stats");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return ZERO_STATS;
  return {
    verifiedProfiles: Number(row.verified_profiles) || 0,
    totalProfiles: Number(row.total_profiles) || 0,
    countries: Number(row.countries) || 0,
    acceptedInterests: Number(row.accepted_interests) || 0,
  };
}
