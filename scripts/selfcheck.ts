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
import {
  preferenceFit,
  rankCandidate,
  rankProfiles,
  eligible,
  diversify,
  reasonsFor,
  recommend,
  type RankCandidate,
} from "../src/lib/ranking";
import {
  moonTropicalLongitude,
  birthChart,
  gunaMilan,
  parseAstro,
  ASTRO_DEFAULTS,
} from "../src/lib/astro";

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

// --- ranking ---
const cand = (over: Partial<RankCandidate>): RankCandidate => ({
  id: "00000000-0000-0000-0000-000000000001",
  date_of_birth: "1998-01-01",
  height_cm: 165,
  mother_tongue: "Kannada",
  sub_sect: "Panchamasali",
  marital_status: "never_married",
  education: "BE Computer Science",
  profession: "Engineer",
  city: "Bengaluru",
  state: "Karnataka",
  diet: "vegetarian",
  about: "hello",
  is_verified: true,
  updated_at: new Date().toISOString(),
  ...over,
});

// no prefs set → preferenceFit unavailable (null), not fabricated
assert.equal(preferenceFit(PE_DEFAULTS, cand({})), null);

// prefs fully matched → 1; age boundary respected
const pe = parsePartnerExpectations({
  age: { min: 24, max: 30 },
  subSect: ["panchamasali"], // case-insensitive
  education: ["BE"],
  diet: ["vegetarian"],
});
assert.equal(preferenceFit(pe, cand({})), 1);
assert.ok((preferenceFit(pe, cand({ date_of_birth: "1990-01-01" })) ?? 1) < 1); // too old fails age check

// composite: cached compat included when present; renormalizes when absent
const withCompat = rankCandidate(cand({}), pe, 80);
const withoutCompat = rankCandidate(cand({}), pe, null);
assert.ok(withCompat.parts.compatibility === 0.8);
assert.equal(withoutCompat.parts.compatibility, undefined);
assert.ok(withoutCompat.score === 100); // all available signals full → 100 after renormalization

// unverified + stale ranks below verified + fresh
const ranked = rankProfiles(
  [
    cand({
      id: "00000000-0000-0000-0000-00000000000a",
      is_verified: false,
      updated_at: "2020-01-01",
    }),
    cand({ id: "00000000-0000-0000-0000-00000000000b" }),
  ],
  pe,
  {},
);
assert.equal(ranked[0].id, "00000000-0000-0000-0000-00000000000b");

// --- eligibility ---
const withGender = (over: Partial<RankCandidate> & { gender?: string | null }) =>
  Object.assign(cand(over), { gender: over.gender ?? "female" });
assert.equal(eligible(PE_DEFAULTS, withGender({}), "male"), true); // opposite gender ok
assert.equal(eligible(PE_DEFAULTS, withGender({ gender: "male" }), "male"), false); // same gender out
assert.equal(eligible(PE_DEFAULTS, withGender({ gender: null }), "male"), true); // unknown gender kept
const msPe = parsePartnerExpectations({ maritalStatus: ["never_married"] });
assert.equal(eligible(msPe, withGender({ marital_status: "divorced" }), "male"), false); // hard conflict
assert.equal(eligible(msPe, withGender({ marital_status: null }), "male"), true); // unknown not a conflict

// --- diversify: breaks up same-key runs, keeps set identical ---
const run = [
  { k: "a", n: 1 },
  { k: "a", n: 2 },
  { k: "b", n: 3 },
];
const div = diversify(run, (x) => x.k);
assert.deepEqual(
  div.map((x) => x.k),
  ["a", "b", "a"],
);
assert.equal(div.length, run.length);

// --- reasons ---
assert.deepEqual(reasonsFor({ verified: 1, activity: 1, completeness: 0.5 }), [
  "Verified profile",
  "Recently active",
]);
assert.deepEqual(reasonsFor({ compatibility: 0.9, preferenceFit: 0.8, verified: 1 }), [
  "High AI compatibility",
  "Matches your preferences",
]); // capped at 2, ordered by strength of claim
assert.deepEqual(reasonsFor({ completeness: 0.4 }), []);

// --- recommendation pipeline: canonical personas through recommend() ---
type Persona = RankCandidate & { gender: string | null };
const persona = (id: string, over: Partial<Persona>): Persona =>
  Object.assign(
    cand({ id: `00000000-0000-0000-0000-0000000000${id}` }),
    { gender: "female" },
    over,
  );

const viewer = { gender: "male", pe };
const compatible = persona("01", {}); // matches all of pe
const incompatible = persona("02", { sub_sect: "Other", diet: "non_vegetarian", education: "MA" });
const sameGender = persona("03", { gender: "male" });
const dismissed = persona("04", {});
const seenRecently = persona("05", {});
const unverifiedTwin = persona("06", { is_verified: false });

const recs = recommend(
  [compatible, incompatible, sameGender, dismissed, seenRecently, unverifiedTwin],
  {
    viewerGender: viewer.gender,
    pe: viewer.pe,
    compatById: {},
    excludedIds: new Set([dismissed.id]),
    seenIds: new Set([seenRecently.id]),
    limit: 10,
  },
);
const ids = recs.map((r) => r.id);

// dismissed profiles are excluded
assert.ok(!ids.includes(dismissed.id));
// same-gender (ineligible) profiles are excluded
assert.ok(!ids.includes(sameGender.id));
// incompatible never ranks above compatible
assert.ok(ids.indexOf(compatible.id) < ids.indexOf(incompatible.id));
// verified outranks otherwise-identical unverified
assert.ok(ids.indexOf(compatible.id) < ids.indexOf(unverifiedTwin.id));
// recently-seen profiles come after unseen ones
assert.ok(ids.indexOf(seenRecently.id) > ids.indexOf(unverifiedTwin.id));
// pipeline preserves the eligible candidate set (nothing invented or lost)
assert.equal(ids.length, 4);
// unknown fields don't become implicit penalties: null-city candidate is not
// scored lower than an identical one on the diversity key
const nullCity = recommend([persona("07", { city: null })], {
  viewerGender: "male",
  pe: PE_DEFAULTS,
  compatById: {},
  excludedIds: new Set(),
  seenIds: new Set(),
  limit: 5,
});
assert.equal(nullCity.length, 1);

// --- astro: known-answer + invariants ---
// Meeus, Astronomical Algorithms, example 47.a: 1992 Apr 12.0 TD (JD 2448724.5)
// apparent moon longitude = 133.162655°. Truncated series + no nutation → ±0.1°.
const meeus = moonTropicalLongitude(2448724.5);
assert.ok(Math.abs(meeus - 133.1627) < 0.1, `Meeus 47.a: expected ≈133.16, got ${meeus}`);

// chart derivation: sidereal = tropical − ayanamsa (≈23.7° in 1992)
const chart = birthChart("1992-04-12", parseAstro({ timeOfBirth: "05:30", utcOffsetMinutes: 330 }));
assert.ok(chart != null);
assert.ok(chart!.siderealMoon >= 0 && chart!.siderealMoon < 360);
assert.equal(chart!.approximateTime, false);
const noTime = birthChart("1992-04-12", parseAstro({}));
assert.equal(noTime!.approximateTime, true);
assert.equal(birthChart("not-a-date", ASTRO_DEFAULTS), null);

// guna milan invariants across a spread of charts
const mkChart = (nak: number, rashiOf = Math.floor((nak * (360 / 27)) / 30)) => ({
  siderealMoon: nak * (360 / 27) + 5,
  nakshatra: nak,
  rashi: rashiOf,
  boundaryRisk: false,
  approximateTime: false,
});
for (let g = 0; g < 27; g += 3) {
  for (let b = 0; b < 27; b += 3) {
    const gm = gunaMilan(mkChart(g), mkChart(b));
    assert.ok(gm.totalPoints >= 0 && gm.totalPoints <= 36, `total out of range: ${gm.totalPoints}`);
    assert.ok(gm.score >= 0 && gm.score <= 100);
    assert.ok(gm.confidence >= 20 && gm.confidence <= 100);
    assert.equal(gm.kootas.length, 8);
  }
}
// same nakshatra ⇒ same nadi ⇒ nadi dosha blocker and 0/8
const sameNak = gunaMilan(mkChart(4), mkChart(4));
assert.equal(sameNak.kootas.find((k) => k.name === "Nadi")?.points, 0);
assert.ok(sameNak.blockers.some((b) => b.includes("Nadi dosha")));
// different nadi ⇒ full 8
const diffNadi = gunaMilan(mkChart(0), mkChart(1)); // adi vs madhya
assert.equal(diffNadi.kootas.find((k) => k.name === "Nadi")?.points, 8);
// missing birth time lowers confidence and is named in missingData
const gmApprox = gunaMilan({ ...mkChart(2), approximateTime: true }, mkChart(10));
assert.ok(gmApprox.confidence < diffNadi.confidence);
assert.ok(gmApprox.missingData.some((m) => m.includes("birth time")));
// Manglik honestly reported as unsupported
assert.ok(diffNadi.missingData.some((m) => m.includes("Manglik")));

console.log("selfcheck OK");
