import { createServerFn } from "@tanstack/react-start";

export type LandingStats = {
  verifiedProfiles: number;
  totalProfiles: number;
  countries: number;
  acceptedInterests: number;
};

export const getLandingStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingStats> => {
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
  },
);
