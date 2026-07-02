import { supabase } from "@/integrations/supabase/client";

/** Columns needed by RankCandidate plus display fields for cards. */
export const RANK_COLS =
  "id, display_name, gender, date_of_birth, height_cm, mother_tongue, sub_sect, marital_status, education, profession, city, state, diet, about, is_verified, updated_at";

/** Cached AI compatibility scores for pairs this viewer participates in (RLS-filtered). */
export async function fetchCompatScores(uid: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("matches")
    .select("profile_a, profile_b, ai_score")
    .or(`profile_a.eq.${uid},profile_b.eq.${uid}`);
  const byId: Record<string, number> = {};
  for (const m of data ?? []) byId[m.profile_a === uid ? m.profile_b : m.profile_a] = m.ai_score;
  return byId;
}

/**
 * Suppressed (dismissed/hidden) and recently-seen profile ids for a viewer.
 * Degrades to empty sets while the migration is unapplied.
 */
export async function fetchEventSets(
  uid: string,
): Promise<{ suppressed: Set<string>; seen: Set<string> }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("profile_events")
    .select("target_profile_id, event_type, created_at")
    .eq("actor_id", uid)
    .or(
      `event_type.in.(dismissed,hidden),and(event_type.eq.profile_opened,created_at.gte.${since})`,
    );
  if (error) {
    console.warn("profile_events unavailable (migration applied?):", error.message);
    return { suppressed: new Set(), seen: new Set() };
  }
  const rows = data ?? [];
  return {
    suppressed: new Set(
      rows.filter((r) => r.event_type !== "profile_opened").map((r) => r.target_profile_id),
    ),
    seen: new Set(
      rows.filter((r) => r.event_type === "profile_opened").map((r) => r.target_profile_id),
    ),
  };
}

/** Fire-and-forget event log; harmless while the migration is unapplied. */
export async function logProfileEvent(
  uid: string,
  targetProfileId: string,
  eventType: "viewed" | "profile_opened" | "dismissed" | "hidden",
): Promise<void> {
  const { error } = await supabase.from("profile_events").insert({
    actor_id: uid,
    target_profile_id: targetProfileId,
    event_type: eventType,
  });
  // Duplicate suppression events hit the partial unique index — that's fine.
  if (error && !error.message.includes("duplicate")) {
    console.warn("profile_events insert failed:", error.message);
  }
}
