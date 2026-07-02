// Recommendation QUALITY evaluation: canonical personas through recommend().
// selfcheck.ts verifies correctness; this file verifies ranking quality and
// guards against subtle regressions as weights/stages evolve.
// Run: node_modules/lovable-tagger/node_modules/.bin/esbuild scripts/eval.ts --bundle --format=esm --platform=node > /tmp/eval.mjs && node /tmp/eval.mjs
import assert from "node:assert";
import { parsePartnerExpectations, PE_DEFAULTS } from "../src/lib/partner-expectations";
import { recommend, rankProfiles, diversify, type RankCandidate } from "../src/lib/ranking";

type Persona = RankCandidate & { gender: string | null };

let seq = 0;
const person = (name: string, over: Partial<Persona>): Persona & { name: string } => ({
  id: `00000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`,
  name,
  date_of_birth: "1997-06-15",
  height_cm: 160,
  mother_tongue: "Kannada",
  sub_sect: "Panchamasali",
  marital_status: "never_married",
  education: "BE",
  profession: "Engineer",
  city: "Bengaluru",
  state: "Karnataka",
  diet: "vegetarian",
  about: "Namaste!",
  is_verified: false,
  updated_at: new Date().toISOString(),
  gender: "female",
  ...over,
});

const names = (recs: Array<{ id: string }>, pool: Array<{ id: string; name: string }>) =>
  recs.map((r) => pool.find((p) => p.id === r.id)?.name);

// ---------------------------------------------------------------------------
// Viewer personas
// ---------------------------------------------------------------------------
const traditional = parsePartnerExpectations({
  age: { min: 24, max: 29 },
  subSect: ["Panchamasali"],
  diet: ["vegetarian"],
  familyType: ["joint"],
  horoscopeRequired: "yes", // consumed by the AI layer, not deterministic ranking
  maritalStatus: ["never_married"],
});
const urbanProfessional = parsePartnerExpectations({
  education: ["BE", "MBA", "MBBS"],
  profession: ["Engineer", "Doctor"],
  location: ["Bengaluru"],
});
const overseas = parsePartnerExpectations({ location: ["California", "USA"], relocation: "yes" });
const secondMarriage = parsePartnerExpectations({ maritalStatus: ["divorced", "widowed"] });
const flexible = PE_DEFAULTS; // no preferences set

// ---------------------------------------------------------------------------
// Scenario 1 — traditional viewer, adversarial pool:
// strong preference matches are UNVERIFIED; distractors are verified but
// mismatched. Top 5 must still contain at least 3 strong matches.
// ---------------------------------------------------------------------------
{
  const strong1 = person("strong1", {});
  const strong2 = person("strong2", { city: "Hubballi", state: "Karnataka" });
  const strong3 = person("strong3", { profession: "Teacher" });
  const distractor = (n: string) =>
    person(n, {
      is_verified: true,
      sub_sect: "Other",
      diet: "non_vegetarian",
      date_of_birth: "1985-01-01", // outside preferred range
    });
  const pool = [
    strong1,
    strong2,
    strong3,
    distractor("shiny1"),
    distractor("shiny2"),
    distractor("shiny3"),
  ];
  const top5 = recommend(pool, {
    viewerGender: "male",
    pe: traditional,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 5,
  });
  const strongInTop5 = top5.filter((r) =>
    [strong1.id, strong2.id, strong3.id].includes(r.id),
  ).length;
  assert.ok(
    strongInTop5 >= 3,
    `traditional: expected ≥3 strong matches in top 5, got ${strongInTop5} (${names(top5, pool)})`,
  );
}

// ---------------------------------------------------------------------------
// Scenario 2 — trust never overrides severe incompatibility:
// a fully verified candidate with a structured hard conflict (marital status)
// is excluded outright, regardless of verification.
// ---------------------------------------------------------------------------
{
  const conflicted = person("conflictedVerified", {
    is_verified: true,
    marital_status: "divorced",
  });
  const ok = person("plainOk", {});
  const recs = recommend([conflicted, ok], {
    viewerGender: "male",
    pe: traditional,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.ok(
    !recs.some((r) => r.id === conflicted.id),
    "hard conflict must exclude despite verification",
  );
  assert.ok(recs.some((r) => r.id === ok.id));
}

// ---------------------------------------------------------------------------
// Scenario 3 — unknown data doesn't dominate: a sparse profile (mostly nulls)
// must not outrank a complete strong match, but must still be recommendable.
// ---------------------------------------------------------------------------
{
  const sparse = person("sparse", {
    date_of_birth: null,
    height_cm: null,
    sub_sect: null,
    education: null,
    profession: null,
    city: null,
    state: null,
    diet: null,
    about: null,
  });
  const complete = person("complete", { is_verified: true });
  const recs = recommend([sparse, complete], {
    viewerGender: "male",
    pe: traditional,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.equal(names(recs, [sparse, complete])[0], "complete");
  assert.equal(recs.length, 2, "sparse profiles are down-ranked, not hidden");
}

// ---------------------------------------------------------------------------
// Scenario 4 — diversity never removes the best candidate or changes the set.
// ---------------------------------------------------------------------------
{
  const pool = [
    person("bestBlr", { is_verified: true }),
    person("blr2", {}),
    person("blr3", {}),
    person("mysuru", { city: "Mysuru" }),
  ];
  const ranked = rankProfiles(pool, traditional, {});
  const diversified = diversify(ranked, (c) => c.city?.toLowerCase() ?? "");
  assert.equal(diversified[0].id, ranked[0].id, "top candidate survives diversity");
  assert.deepEqual(
    [...diversified].map((c) => c.id).sort(),
    [...ranked].map((c) => c.id).sort(),
    "diversity preserves the candidate set",
  );
}

// ---------------------------------------------------------------------------
// Scenario 5 — recently dismissed profiles stay suppressed across reruns.
// ---------------------------------------------------------------------------
{
  const a = person("keeper", {});
  const b = person("dismissedOne", {});
  for (let run = 0; run < 3; run++) {
    const recs = recommend([a, b], {
      viewerGender: "male",
      pe: flexible,
      compatById: {},
      excludedIds: new Set([b.id]),
      seenIds: new Set(),
      limit: 10,
    });
    assert.ok(!recs.some((r) => r.id === b.id), `dismissed leaked on run ${run}`);
  }
}

// ---------------------------------------------------------------------------
// Scenario 6 — persona sanity sweeps
// ---------------------------------------------------------------------------
{
  // Second-marriage viewer: divorced/widowed candidates are eligible, never-married is a hard conflict.
  const divorced = person("divorcedCand", { marital_status: "divorced" });
  const widowed = person("widowedCand", { marital_status: "widowed" });
  const never = person("neverCand", {});
  const recs = recommend([divorced, widowed, never], {
    viewerGender: "male",
    pe: secondMarriage,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.deepEqual(names(recs, [divorced, widowed, never]).sort(), ["divorcedCand", "widowedCand"]);

  // Overseas viewer: candidate in preferred location outranks one elsewhere.
  const inCalifornia = person("cali", { city: "San Jose", state: "California" });
  const inBlr = person("blrLocal", {});
  const oRecs = recommend([inBlr, inCalifornia], {
    viewerGender: "male",
    pe: overseas,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.equal(names(oRecs, [inCalifornia, inBlr])[0], "cali");

  // Urban professional: education/profession matches lead.
  const doctor = person("doctorMBBS", { education: "MBBS", profession: "Doctor" });
  const artist = person("artist", { education: "BFA", profession: "Artist" });
  const uRecs = recommend([artist, doctor], {
    viewerGender: "male",
    pe: urbanProfessional,
    compatById: {},
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.equal(names(uRecs, [doctor, artist])[0], "doctorMBBS");

  // Flexible viewer: nobody eliminated except by gender; ranking still stable.
  const fRecs = recommend(
    [person("f1", {}), person("f2", { is_verified: true }), person("m1", { gender: "male" })],
    {
      viewerGender: "male",
      pe: flexible,
      compatById: {},
      excludedIds: new Set(),
      seenIds: new Set(),
      limit: 10,
    },
  );
  assert.equal(fRecs.length, 2);
  assert.equal(fRecs[0].is_verified, true, "with no prefs, verification leads");
}

// ---------------------------------------------------------------------------
// Scenario 7 — cached AI compatibility lifts an otherwise-identical candidate,
// and a candidate with NO compat score can't outrank one purely by having
// fewer signals (the renormalization trap).
// ---------------------------------------------------------------------------
{
  const known = person("knownHighCompat", {});
  const unknown = person("noCompatYet", {});
  const recs = recommend([unknown, known], {
    viewerGender: "male",
    pe: flexible,
    compatById: { [known.id]: 95 },
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.equal(names(recs, [known, unknown])[0], "knownHighCompat");

  // a LOW cached compat score must drag a candidate below its identical twin
  const lowKnown = person("knownLowCompat", {});
  const twin = person("twin", {});
  const lowRecs = recommend([lowKnown, twin], {
    viewerGender: "male",
    pe: flexible,
    compatById: { [lowKnown.id]: 10 },
    excludedIds: new Set(),
    seenIds: new Set(),
    limit: 10,
  });
  assert.equal(names(lowRecs, [lowKnown, twin])[0], "twin");
}

console.log("eval OK — recommendation quality invariants hold");
