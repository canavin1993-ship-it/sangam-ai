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
