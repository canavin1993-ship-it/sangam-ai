// Self-check for partner-expectations + profile-completeness logic.
// Run: node_modules/lovable-tagger/node_modules/.bin/esbuild scripts/selfcheck.ts --bundle --format=esm --platform=node > /tmp/selfcheck.mjs && node /tmp/selfcheck.mjs
import assert from "node:assert";
import {
  parsePartnerExpectations,
  mergePartnerExpectations,
  validatePartnerExpectations,
  PE_DEFAULTS,
} from "../src/lib/partner-expectations";
import { computeCompleteness, type CompletenessInput } from "../src/lib/profile-completeness";
import { computeTrustScore } from "../src/lib/trust-score";

// --- parse tolerance ---
assert.equal(parsePartnerExpectations(null).schemaVersion, 1);
assert.deepEqual(parsePartnerExpectations("garbage").age, { min: null, max: null });
assert.deepEqual(parsePartnerExpectations({ age: { min: "bad" } }).age, { min: null, max: null });
assert.deepEqual(parsePartnerExpectations({ diet: ["vegetarian", "not_a_diet"] }).diet, []); // invalid list falls back whole
assert.equal(parsePartnerExpectations({ age: { min: 25, max: 30 } }).age.min, 25);

// --- merge preserves unknown keys ---
const merged = mergePartnerExpectations(
  { futureKey: { a: 1 }, age: { min: 21, max: 28 } },
  { subSect: ["Panchamasali"] },
);
assert.deepEqual((merged as Record<string, unknown>).futureKey, { a: 1 });
assert.equal(merged.age.min, 21);
assert.deepEqual(merged.subSect, ["Panchamasali"]);
assert.equal(merged.schemaVersion, 1);

// --- validation ---
assert.equal(validatePartnerExpectations(PE_DEFAULTS).length, 0);
assert.ok(validatePartnerExpectations({ ...PE_DEFAULTS, age: { min: 30, max: 25 } }).length > 0);
assert.ok(validatePartnerExpectations({ ...PE_DEFAULTS, age: { min: 16, max: null } }).length > 0);
assert.ok(
  validatePartnerExpectations({ ...PE_DEFAULTS, height: { min: 20, max: null } }).length > 0,
);

// --- completeness ---
const empty: CompletenessInput = {
  profile: {
    display_name: null,
    gender: null,
    date_of_birth: null,
    height_cm: null,
    marital_status: null,
    city: null,
    education: null,
    profession: null,
    about: null,
    diet: null,
    drinking: null,
    smoking: null,
    is_verified: false,
    partner_expectations: null,
  },
  photoCount: 0,
  familyStatuses: [],
};
const c0 = computeCompleteness(empty);
assert.equal(c0.percent, 0);
assert.equal(c0.missing.length, 7);
assert.ok(c0.nextAction != null);

const full: CompletenessInput = {
  profile: {
    display_name: "A",
    gender: "male",
    date_of_birth: "1995-01-01",
    height_cm: 175,
    marital_status: "never_married",
    city: "Bengaluru",
    education: "BE",
    profession: "Engineer",
    about:
      "A long about section that easily exceeds the fifty character threshold for full credit.",
    diet: "vegetarian",
    drinking: "no",
    smoking: "no",
    is_verified: true,
    partner_expectations: {
      age: { min: 24, max: 30 },
      maritalStatus: ["never_married"],
      subSect: ["Panchamasali"],
      location: ["Bengaluru"],
      education: ["BE"],
      diet: ["vegetarian"],
      mustHave: ["kind"],
    },
  },
  photoCount: 2,
  familyStatuses: ["accepted"],
};
const c100 = computeCompleteness(full);
assert.equal(c100.percent, 100, `expected 100, got ${c100.percent}`);
assert.equal(c100.missing.length, 0);
assert.equal(c100.nextAction, null);

// weights sum to 1
assert.equal(Math.round(c100.sections.reduce((s, x) => s + x.weight, 0) * 100), 100);

// suggestions ordered by impact: verification (0.15 gap) outranks lifestyle (0.05)
const partial = computeCompleteness({
  ...full,
  profile: { ...full.profile, is_verified: false, diet: null, drinking: null, smoking: null },
});
assert.equal(partial.suggestions[0].section, "verification");

// narrow age range nudge
const narrow = computeCompleteness({
  ...full,
  profile: {
    ...full.profile,
    partner_expectations: {
      ...(full.profile.partner_expectations as object),
      age: { min: 26, max: 27 },
    },
  },
});
assert.ok(narrow.suggestions.some((s) => s.action.includes("age range")));

// --- trust score ---
const zeroTrust = computeTrustScore({
  completeness: empty,
  verifications: [],
  photoModerations: [],
  updatedAt: new Date(Date.now() - 200 * 86_400_000).toISOString(), // stale
});
assert.equal(zeroTrust.score, 0);
assert.equal(zeroTrust.suggestions[0].key, "idVerified"); // biggest weight first

const fullTrust = computeTrustScore({
  completeness: full,
  verifications: [
    { type: "id", status: "approved" },
    { type: "selfie", status: "approved" },
    { type: "mobile", status: "approved" },
    { type: "email", status: "approved" },
  ],
  photoModerations: ["approved", "approved"],
  updatedAt: new Date().toISOString(),
});
assert.equal(fullTrust.score, 100, `expected 100, got ${fullTrust.score}`);
assert.equal(fullTrust.suggestions.length, 0);

// pending verification earns nothing
const pendingTrust = computeTrustScore({
  completeness: full,
  verifications: [{ type: "id", status: "pending" }],
  photoModerations: ["pending"],
  updatedAt: new Date().toISOString(),
});
assert.ok(pendingTrust.factors.find((f) => f.key === "idVerified")?.score === 0);
assert.ok(pendingTrust.factors.find((f) => f.key === "photosApproved")?.score === 0);

// face_match counts as face verification
const faceTrust = computeTrustScore({
  completeness: full,
  verifications: [{ type: "face_match", status: "approved" }],
  photoModerations: [],
  updatedAt: new Date().toISOString(),
});
assert.equal(faceTrust.factors.find((f) => f.key === "faceVerified")?.score, 1);

console.log("selfcheck OK");
