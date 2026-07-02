import { parsePartnerExpectations } from "./partner-expectations";

// All weights live here; UI derives everything from computeCompleteness().
const WEIGHTS = {
  basic: 0.2,
  photos: 0.15,
  verification: 0.15,
  partnerExpectations: 0.2,
  family: 0.15,
  about: 0.1,
  lifestyle: 0.05,
} as const;

export type SectionKey = keyof typeof WEIGHTS;

export type CompletenessInput = {
  profile: {
    display_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    height_cm: number | null;
    marital_status: string | null;
    city: string | null;
    education: string | null;
    profession: string | null;
    about: string | null;
    diet: string | null;
    drinking: string | null;
    smoking: string | null;
    is_verified: boolean;
    partner_expectations: unknown;
  };
  photoCount: number;
  familyStatuses: string[]; // family_members.status values for this profile
};

export type Suggestion = { action: string; section: SectionKey };

export type Completeness = {
  percent: number; // 0–100
  sections: Array<{ key: SectionKey; label: string; weight: number; score: number }>;
  missing: SectionKey[]; // sections below full credit
  nextAction: Suggestion | null; // highest-impact incomplete section
  suggestions: Suggestion[]; // ordered by impact (weight × gap)
};

const LABELS: Record<SectionKey, string> = {
  basic: "Basic profile",
  photos: "Photos",
  verification: "Verification",
  partnerExpectations: "Partner expectations",
  family: "Family details",
  about: "About me",
  lifestyle: "Lifestyle",
};

function frac(filled: number, total: number) {
  return total === 0 ? 0 : filled / total;
}

export function computeCompleteness(input: CompletenessInput): Completeness {
  const { profile: p, photoCount, familyStatuses } = input;
  const pe = parsePartnerExpectations(p.partner_expectations);

  const basicFields = [
    p.display_name,
    p.gender,
    p.date_of_birth,
    p.height_cm,
    p.marital_status,
    p.city,
    p.education,
    p.profession,
  ];
  const peGroups = [
    pe.age.min != null || pe.age.max != null,
    pe.maritalStatus.length > 0,
    pe.subSect.length > 0 || pe.community.length > 0,
    pe.location.length > 0 || pe.relocation != null,
    pe.education.length > 0 || pe.profession.length > 0,
    pe.diet.length > 0 || pe.smoking != null || pe.drinking != null,
    pe.mustHave.length > 0 || pe.dealBreakers.length > 0,
  ];
  const lifestyleFields = [p.diet, p.drinking, p.smoking];
  const familyScore = familyStatuses.some((s) => s === "accepted")
    ? 1
    : familyStatuses.length > 0
      ? 0.5
      : 0;
  const aboutLen = p.about?.trim().length ?? 0;

  const scores: Record<SectionKey, number> = {
    basic: frac(basicFields.filter((f) => f != null && f !== "").length, basicFields.length),
    photos: Math.min(photoCount, 2) / 2,
    verification: p.is_verified ? 1 : 0,
    partnerExpectations: frac(peGroups.filter(Boolean).length, peGroups.length),
    family: familyScore,
    about: aboutLen >= 50 ? 1 : aboutLen > 0 ? 0.5 : 0,
    lifestyle: frac(
      lifestyleFields.filter((f) => f != null && f !== "").length,
      lifestyleFields.length,
    ),
  };

  const sections = (Object.keys(WEIGHTS) as SectionKey[]).map((key) => ({
    key,
    label: LABELS[key],
    weight: WEIGHTS[key],
    score: scores[key],
  }));

  const percent = Math.round(sections.reduce((sum, s) => sum + s.weight * s.score, 0) * 100);
  const missing = sections.filter((s) => s.score < 1).map((s) => s.key);

  // Data-driven suggestions, ordered by impact (weight × remaining gap).
  const actionFor: Record<SectionKey, (score: number) => string> = {
    basic: () => "Fill in the remaining basic details (height, city, education…)",
    photos: (s) => (s === 0 ? "Upload a profile photo" : "Upload another photo"),
    verification: () => "Verify your identity to earn the verified badge",
    partnerExpectations: (s) =>
      s === 0 ? "Add your partner expectations" : "Complete more partner expectation sections",
    family: (s) =>
      s === 0
        ? "Invite a family member to your profile"
        : "Waiting on a family member to accept — follow up",
    about: (s) =>
      s === 0 ? "Write an About section" : "Expand your About section (aim for a few sentences)",
    lifestyle: () => "Add lifestyle details (diet, smoking, drinking)",
  };
  const suggestions: Suggestion[] = sections
    .filter((s) => s.score < 1)
    .sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score))
    .map((s) => ({ action: actionFor[s.key](s.score), section: s.key }));

  // Extra data-driven nudge: a very narrow age range limits match volume.
  if (pe.age.min != null && pe.age.max != null && pe.age.max - pe.age.min < 3) {
    suggestions.push({
      action: "Consider widening your preferred age range for more matches",
      section: "partnerExpectations",
    });
  }

  return { percent, sections, missing, nextAction: suggestions[0] ?? null, suggestions };
}
