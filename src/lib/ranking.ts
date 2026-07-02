import type { PartnerExpectations } from "./partner-expectations";

// Pure ranking math only — Supabase queries live in ranking.queries.ts so this
// module stays importable from the node selfcheck.

// Ranks candidate profiles for a viewer using only RLS-visible signals:
// the candidate's active-profile row, the viewer's own partner expectations,
// and any cached AI compatibility score for pairs the viewer participates in.
// Owner-only signals (verifications detail, family links, reports) are NOT
// available to viewers, so "trust" here is the visible is_verified flag.
// Base-signal weights, tuned by scripts/eval.ts: preferenceFit must outweigh
// the verified badge, or verified-but-mismatched profiles outrank unverified
// strong matches. Cached AI compatibility is blended in separately (see
// COMPAT_BLEND), never renormalized into this denominator.
const WEIGHTS = {
  preferenceFit: 30, // viewer's expectations vs candidate fields
  verified: 15,
  activity: 10,
  completeness: 10, // visible-field completeness
} as const;

export type RankSignalKey = keyof typeof WEIGHTS | "compatibility";

export type RankCandidate = {
  id: string;
  date_of_birth: string | null;
  height_cm: number | null;
  mother_tongue: string | null;
  sub_sect: string | null;
  marital_status: string | null;
  education: string | null;
  profession: string | null;
  city: string | null;
  state: string | null;
  diet: string | null;
  about: string | null;
  is_verified: boolean;
  updated_at: string;
};

export type RankResult = {
  score: number; // 0–100, weighted over available signals
  parts: Partial<Record<RankSignalKey, number>>; // 0–1 per available signal
};

export function activityFreshness(updatedAt: string): number {
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  return days <= 30 ? 1 : days <= 90 ? 0.5 : 0;
}

function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

const ciIncludes = (list: string[], value: string | null) =>
  value != null && list.some((x) => x.toLowerCase() === value.toLowerCase());
const ciSubstr = (list: string[], value: string | null) =>
  value != null && list.some((x) => value.toLowerCase().includes(x.toLowerCase()));

/**
 * Fraction of the viewer's SET preferences the candidate satisfies.
 * Returns null when the viewer has set none of the checkable preferences.
 */
export function preferenceFit(pe: PartnerExpectations, c: RankCandidate): number | null {
  const checks: boolean[] = [];
  const age = ageFrom(c.date_of_birth);
  if (pe.age.min != null || pe.age.max != null) {
    checks.push(
      age != null &&
        (pe.age.min == null || age >= pe.age.min) &&
        (pe.age.max == null || age <= pe.age.max),
    );
  }
  if (pe.height.min != null || pe.height.max != null) {
    checks.push(
      c.height_cm != null &&
        (pe.height.min == null || c.height_cm >= pe.height.min) &&
        (pe.height.max == null || c.height_cm <= pe.height.max),
    );
  }
  if (pe.subSect.length) checks.push(ciIncludes(pe.subSect, c.sub_sect));
  if (pe.location.length)
    checks.push(ciIncludes(pe.location, c.city) || ciIncludes(pe.location, c.state));
  if (pe.education.length) checks.push(ciSubstr(pe.education, c.education));
  if (pe.profession.length) checks.push(ciSubstr(pe.profession, c.profession));
  if (pe.maritalStatus.length) checks.push(ciIncludes(pe.maritalStatus, c.marital_status));
  if (pe.diet.length) checks.push(ciIncludes(pe.diet, c.diet));
  if (pe.language.length) checks.push(ciIncludes(pe.language, c.mother_tongue));
  if (checks.length === 0) return null;
  return checks.filter(Boolean).length / checks.length;
}

/** Visible-field completeness — how much a candidate lets others see. */
function visibleCompleteness(c: RankCandidate): number {
  const fields = [
    c.date_of_birth,
    c.height_cm,
    c.sub_sect,
    c.education,
    c.profession,
    c.city,
    c.diet,
    c.about,
  ];
  return fields.filter((f) => f != null && f !== "").length / fields.length;
}

// Compat share of the final score when a cached AI score exists. Blending
// (instead of renormalizing compat into the denominator) keeps the base score
// comparable across candidates: per-candidate denominators let candidates
// with LESS data renormalize higher — missing data must never dominate.
const COMPAT_BLEND = 0.35;

export function rankCandidate(
  c: RankCandidate,
  viewerPE: PartnerExpectations,
  cachedCompatScore: number | null,
): RankResult {
  const parts: Partial<Record<RankSignalKey, number>> = {
    verified: c.is_verified ? 1 : 0,
    activity: activityFreshness(c.updated_at),
    completeness: visibleCompleteness(c),
  };
  // preferenceFit availability is viewer-level (did the viewer set prefs?),
  // so the base denominator is identical for every candidate in a run.
  const fit = preferenceFit(viewerPE, c);
  if (fit != null) parts.preferenceFit = fit;

  let weighted = 0;
  let total = 0;
  for (const key of Object.keys(parts) as Array<keyof typeof WEIGHTS>) {
    weighted += WEIGHTS[key] * (parts[key] as number);
    total += WEIGHTS[key];
  }
  const base = total === 0 ? 0 : (weighted / total) * 100;

  if (cachedCompatScore != null) {
    parts.compatibility = cachedCompatScore / 100;
    return {
      score: Math.round(COMPAT_BLEND * cachedCompatScore + (1 - COMPAT_BLEND) * base),
      parts,
    };
  }
  return { score: Math.round(base), parts };
}

/**
 * Eligibility: structured hard conflicts only. Free-text preferences
 * (mustHave/dealBreakers) stay with the AI explanation, not hard exclusion.
 */
export function eligible(
  pe: PartnerExpectations,
  c: RankCandidate & { gender: string | null },
  viewerGender: string | null,
): boolean {
  // Matrimony convention: opposite-gender matches when both genders are known.
  if (viewerGender && c.gender && c.gender === viewerGender) return false;
  // Marital status is a structured requirement when set; unknown is not a conflict.
  if (
    pe.maritalStatus.length &&
    c.marital_status &&
    !ciIncludes(pe.maritalStatus, c.marital_status)
  )
    return false;
  return true;
}

/**
 * Break up runs of near-identical candidates (same key) by pulling the next
 * differing candidate forward. Preserves overall order otherwise.
 */
// ponytail: O(n²) window swap, fine for n≤100 page sizes; revisit if lists grow.
export function diversify<T>(items: T[], keyOf: (t: T) => string): T[] {
  const out = [...items];
  for (let i = 1; i < out.length - 1; i++) {
    if (keyOf(out[i]) && keyOf(out[i]) === keyOf(out[i - 1])) {
      const j = out.findIndex((x, k) => k > i && keyOf(x) !== keyOf(out[i - 1]));
      if (j > i) {
        const [moved] = out.splice(j, 1);
        out.splice(i, 0, moved);
      }
    }
  }
  return out;
}

/** Top reasons a candidate ranked well — for "Recommended because…" UI. */
export function reasonsFor(parts: RankResult["parts"]): string[] {
  const reasons: string[] = [];
  if ((parts.compatibility ?? 0) >= 0.7) reasons.push("High AI compatibility");
  if ((parts.preferenceFit ?? 0) >= 0.75) reasons.push("Matches your preferences");
  if (parts.verified === 1) reasons.push("Verified profile");
  if (parts.activity === 1) reasons.push("Recently active");
  return reasons.slice(0, 2);
}

/** Sort candidates best-first; ties broken by activity, then id for stability. */
export function rankProfiles<T extends RankCandidate>(
  candidates: T[],
  viewerPE: PartnerExpectations,
  compatByProfileId: Record<string, number>,
): Array<T & { rank: RankResult }> {
  return candidates
    .map((c) => ({ ...c, rank: rankCandidate(c, viewerPE, compatByProfileId[c.id] ?? null) }))
    .sort(
      (a, b) =>
        b.rank.score - a.rank.score ||
        activityFreshness(b.updated_at) - activityFreshness(a.updated_at) ||
        a.id.localeCompare(b.id),
    );
}

export type RecommendContext = {
  viewerGender: string | null;
  pe: PartnerExpectations;
  compatById: Record<string, number>;
  /** blocked, already-interested, dismissed, hidden */
  excludedIds: ReadonlySet<string>;
  /** recently opened profiles — kept, but shown after unseen ones */
  seenIds: ReadonlySet<string>;
  limit: number;
};

/**
 * Full recommendation pipeline: exclusions → eligibility → ranking →
 * seen-last freshness → limit → diversity. Pure, so the selfcheck can run
 * canonical personas through it end to end.
 */
export function recommend<T extends RankCandidate & { gender: string | null }>(
  pool: T[],
  ctx: RecommendContext,
): Array<T & { rank: RankResult }> {
  const ranked = rankProfiles(
    pool.filter((c) => !ctx.excludedIds.has(c.id) && eligible(ctx.pe, c, ctx.viewerGender)),
    ctx.pe,
    ctx.compatById,
  );
  // Freshness: unseen first, order preserved within each group.
  const unseen = ranked.filter((c) => !ctx.seenIds.has(c.id));
  const seen = ranked.filter((c) => ctx.seenIds.has(c.id));
  return diversify([...unseen, ...seen].slice(0, ctx.limit), (c) => c.city?.toLowerCase() ?? "");
}
