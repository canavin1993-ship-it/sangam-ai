import { z } from "zod";

// Versioned schema stored in profiles.partner_expectations JSONB.
// .catch() makes parsing tolerant of legacy/partial data; .passthrough()
// preserves unknown keys so future versions' data is never dropped on save.

export const MARITAL_STATUSES = [
  "never_married",
  "divorced",
  "widowed",
  "awaiting_divorce",
] as const;
export const DIETS = ["vegetarian", "vegan", "eggetarian", "non_vegetarian"] as const;
export const FAMILY_TYPES = ["joint", "nuclear"] as const;

const nullableNum = z.number().finite().nullable().catch(null);
const range = z.object({ min: nullableNum, max: nullableNum }).catch({ min: null, max: null });
const strArray = z.array(z.string().trim().min(1)).catch([]);
const triState = z.enum(["yes", "no"]).nullable().catch(null); // null = no preference

export const PartnerExpectationsSchema = z
  .object({
    schemaVersion: z.literal(1).catch(1),
    age: range,
    height: range, // cm
    education: strArray,
    profession: strArray,
    location: strArray,
    relocation: triState,
    maritalStatus: z.array(z.enum(MARITAL_STATUSES)).catch([]),
    community: strArray,
    subSect: strArray,
    language: strArray,
    diet: z.array(z.enum(DIETS)).catch([]),
    smoking: triState, // "yes" = acceptable, "no" = not acceptable, null = no preference
    drinking: triState,
    horoscopeRequired: triState,
    childrenPreference: z.enum(["want", "dont_want", "open"]).nullable().catch(null),
    familyType: z.array(z.enum(FAMILY_TYPES)).catch([]),
    mustHave: strArray,
    niceToHave: strArray,
    dealBreakers: strArray,
    importanceWeights: z.record(z.string(), z.number()).catch({}),
  })
  .passthrough();

export type PartnerExpectations = z.infer<typeof PartnerExpectationsSchema>;

export const PE_DEFAULTS: PartnerExpectations = PartnerExpectationsSchema.parse({});

/** Tolerant parse of whatever is in the DB; never throws. */
export function parsePartnerExpectations(json: unknown): PartnerExpectations {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return { ...PE_DEFAULTS };
  return PartnerExpectationsSchema.parse(json);
}

/** Merge edited fields over the stored value, preserving unknown keys. Throws ZodError on invalid input. */
export function mergePartnerExpectations(
  stored: unknown,
  edits: Partial<PartnerExpectations>,
): PartnerExpectations {
  const base = stored != null && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  return PartnerExpectationsSchema.parse({ ...base, ...edits, schemaVersion: 1 });
}

/** Cross-field validation; returns human-readable errors (empty = valid). */
export function validatePartnerExpectations(pe: PartnerExpectations): string[] {
  const errors: string[] = [];
  if (pe.age.min != null && pe.age.max != null && pe.age.min > pe.age.max)
    errors.push("Minimum age must be ≤ maximum age.");
  if (pe.age.min != null && pe.age.min < 18) errors.push("Minimum age must be at least 18.");
  if (pe.age.max != null && pe.age.max > 100) errors.push("Maximum age must be realistic (≤ 100).");
  if (pe.height.min != null && pe.height.max != null && pe.height.min > pe.height.max)
    errors.push("Minimum height must be ≤ maximum height.");
  if (pe.height.min != null && (pe.height.min < 100 || pe.height.min > 250))
    errors.push("Height must be in cm (100–250).");
  if (pe.height.max != null && (pe.height.max < 100 || pe.height.max > 250))
    errors.push("Height must be in cm (100–250).");
  return errors;
}
