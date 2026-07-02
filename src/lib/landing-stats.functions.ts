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

async function computeLandingStats(): Promise<LandingStats> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [verified, total, accepted, countryRows] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("is_verified", true)
      .eq("status", "active"),
    supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("status", "active"),
    supabaseAdmin
      .from("interests")
      .select("id", { head: true, count: "exact" })
      .eq("status", "accepted"),
    supabaseAdmin
      .from("profiles")
      .select("country")
      .eq("status", "active")
      .not("country", "is", null),
  ]);

  const countries = new Set(
    (countryRows.data ?? []).map((r) => (r.country ?? "").trim().toLowerCase()).filter(Boolean),
  ).size;

  return {
    verifiedProfiles: verified.count ?? 0,
    totalProfiles: total.count ?? 0,
    countries,
    acceptedInterests: accepted.count ?? 0,
  };
}
