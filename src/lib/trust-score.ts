import { computeCompleteness, type CompletenessInput } from "./profile-completeness";

// Self-facing trust score from signals the profile owner can read under RLS.
// "No unresolved reports" is intentionally absent: reports are readable only by
// reporter/staff, so including it would mean fabricating a value. Weights are
// normalized so the visible signals still sum to 100.
const WEIGHTS = {
  idVerified: 25, // government ID approved
  faceVerified: 15, // selfie or face_match approved
  completeness: 15,
  mobileVerified: 10,
  photosApproved: 10,
  familyLinked: 10,
  emailVerified: 5,
  recentActivity: 5,
} as const;

export type TrustSignalKey = keyof typeof WEIGHTS;

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

const LABELS: Record<TrustSignalKey, string> = {
  idVerified: "Government ID verified",
  faceVerified: "Face verification",
  completeness: "Profile completeness",
  mobileVerified: "Mobile verified",
  photosApproved: "Approved photos",
  familyLinked: "Family linked",
  emailVerified: "Email verified",
  recentActivity: "Recently active",
};

export type TrustInput = {
  completeness: CompletenessInput;
  /** verifications rows for this profile: { type, status } */
  verifications: Array<{ type: string; status: string }>;
  /** photos.moderation values for this profile */
  photoModerations: string[];
  /** profiles.updated_at */
  updatedAt: string;
};

export type TrustScore = {
  score: number; // 0–100
  factors: Array<{ key: TrustSignalKey; label: string; weight: number; score: number }>;
  suggestions: Array<{ action: string; key: TrustSignalKey }>;
};

export function computeTrustScore(input: TrustInput): TrustScore {
  const approved = (type: string) =>
    input.verifications.some((v) => v.type === type && v.status === "approved");

  const daysSinceUpdate = (Date.now() - new Date(input.updatedAt).getTime()) / 86_400_000;
  const approvedPhotos = input.photoModerations.filter((m) => m === "approved").length;

  const scores: Record<TrustSignalKey, number> = {
    idVerified: approved("id") ? 1 : 0,
    faceVerified: approved("selfie") || approved("face_match") ? 1 : 0,
    completeness: computeCompleteness(input.completeness).percent / 100,
    mobileVerified: approved("mobile") ? 1 : 0,
    photosApproved: Math.min(approvedPhotos, 2) / 2,
    familyLinked: input.completeness.familyStatuses.some((s) => s === "accepted") ? 1 : 0,
    emailVerified: approved("email") ? 1 : 0,
    recentActivity: daysSinceUpdate <= 30 ? 1 : daysSinceUpdate <= 90 ? 0.5 : 0,
  };

  const factors = (Object.keys(WEIGHTS) as TrustSignalKey[]).map((key) => ({
    key,
    label: LABELS[key],
    weight: WEIGHTS[key],
    score: scores[key],
  }));

  const score = Math.round(
    (factors.reduce((sum, f) => sum + f.weight * f.score, 0) / TOTAL_WEIGHT) * 100,
  );

  const actionFor: Record<TrustSignalKey, string> = {
    idVerified: "Verify your government ID — the single biggest trust boost",
    faceVerified: "Complete a selfie verification",
    completeness: "Complete more of your profile",
    mobileVerified: "Verify your mobile number",
    photosApproved: "Add photos (they're reviewed before counting)",
    familyLinked: "Invite a family member — accepted links build trust",
    emailVerified: "Verify your email address",
    recentActivity: "Keep your profile fresh — update any detail",
  };
  const suggestions = factors
    .filter((f) => f.score < 1)
    .sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score))
    .map((f) => ({ action: actionFor[f.key], key: f.key }));

  return { score, factors, suggestions };
}
