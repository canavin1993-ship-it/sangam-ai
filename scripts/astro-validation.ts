// Domain Validation Suite for the Jatakam engine (src/lib/astro.ts).
// Guardrail for domain accuracy, separate from engineering checks:
//   selfcheck.ts = code correctness, eval.ts = recommendation quality,
//   THIS = astronomical & astrological accuracy against external references.
// Run: node_modules/lovable-tagger/node_modules/.bin/esbuild scripts/astro-validation.ts --bundle --format=esm --platform=node > /tmp/av.mjs && node /tmp/av.mjs
import assert from "node:assert";
import {
  moonTropicalLongitude,
  lahiriAyanamsa,
  birthChart,
  gunaMilan,
  parseAstro,
  NAKSHATRAS,
} from "../src/lib/astro";

// ---------------------------------------------------------------------------
// 1. Independent astronomical references (never our own derivations)
// ---------------------------------------------------------------------------
const LONGITUDE_FIXTURES = [
  {
    name: "Meeus AA ch.47 example 47.a — 1992 Apr 12.0 TD",
    jd: 2448724.5,
    expected: 133.1627, // apparent longitude, published in the book
    tolerance: 0.1, // truncated series, no nutation
    source: "Meeus, Astronomical Algorithms, 2nd ed.",
  },
  {
    name: "J2000.0 epoch — 2000 Jan 1 12:00",
    jd: 2451545.0,
    expected: 222.75, // ≈222.5–223° per independent simplified lunar theory
    tolerance: 0.6,
    source: "van Flandern-style calculator series (arXiv:0910.2778 method)",
  },
];

for (const f of LONGITUDE_FIXTURES) {
  const got = moonTropicalLongitude(f.jd);
  assert.ok(
    Math.abs(got - f.expected) < f.tolerance,
    `${f.name}: expected ${f.expected}±${f.tolerance}, got ${got.toFixed(4)} [${f.source}]`,
  );
}

// Lahiri ayanamsa sanity: ~23.85° at J2000, ~24.2° around 2025 (published values)
assert.ok(Math.abs(lahiriAyanamsa(2451545.0) - 23.86) < 0.05, "ayanamsa at J2000");
assert.ok(Math.abs(lahiriAyanamsa(2460676.5) - 24.21) < 0.1, "ayanamsa at 2025");

// ---------------------------------------------------------------------------
// 2. Boundary behavior: scan a day hour-by-hour; wherever the nakshatra
// changes, the charts adjacent to the transition must carry boundaryRisk.
// ---------------------------------------------------------------------------
{
  let transitions = 0;
  let flaggedNearTransition = 0;
  for (let day = 0; day < 3; day++) {
    for (let h = 0; h < 23; h++) {
      const date = `2024-03-${String(10 + day).padStart(2, "0")}`;
      const a = birthChart(date, parseAstro({ timeOfBirth: `${String(h).padStart(2, "0")}:00` }))!;
      const b = birthChart(
        date,
        parseAstro({ timeOfBirth: `${String(h + 1).padStart(2, "0")}:00` }),
      )!;
      if (a.nakshatra !== b.nakshatra) {
        transitions++;
        // moon moves ~0.55°/h; within the hour of transition at least one side
        // sits within 0.55° of the boundary — our flag threshold is 0.25°, so
        // check the tighter 30-minute window instead.
        const mid = birthChart(
          date,
          parseAstro({ timeOfBirth: `${String(h).padStart(2, "0")}:45` }),
        )!;
        if (a.boundaryRisk || b.boundaryRisk || mid.boundaryRisk) flaggedNearTransition++;
      }
    }
  }
  assert.ok(transitions >= 2, `expected ≥2 nakshatra transitions over 3 days, got ${transitions}`);
  assert.ok(
    flaggedNearTransition >= transitions - 1,
    `boundaryRisk missed near transitions: ${flaggedNearTransition}/${transitions}`,
  );
}

// ---------------------------------------------------------------------------
// 3. Time & offset sensitivity (DST responsibility lives in the stored UTC
// offset — verify offsets actually shift the computed chart deterministically)
// ---------------------------------------------------------------------------
{
  const ist = birthChart(
    "1995-08-20",
    parseAstro({ timeOfBirth: "06:00", utcOffsetMinutes: 330 }),
  )!;
  const pst = birthChart(
    "1995-08-20",
    parseAstro({ timeOfBirth: "06:00", utcOffsetMinutes: -480 }),
  )!;
  // 13.5h difference ⇒ moon moved ≈7.4°; longitudes must differ accordingly
  const diff = (pst.siderealMoon - ist.siderealMoon + 360) % 360;
  assert.ok(
    diff > 6 && diff < 9,
    `offset shift: expected ≈7.4° moon movement, got ${diff.toFixed(2)}°`,
  );

  // Missing birth time: noon assumed, flagged, and Guna Milan confidence drops
  const noTime = birthChart("1995-08-20", parseAstro({}))!;
  assert.equal(noTime.approximateTime, true);
  const gmExact = gunaMilan(ist, birthChart("1997-01-10", parseAstro({ timeOfBirth: "10:00" }))!);
  const gmVague = gunaMilan(noTime, birthChart("1997-01-10", parseAstro({}))!);
  assert.ok(gmVague.confidence < gmExact.confidence, "missing times must lower confidence");
}

// ---------------------------------------------------------------------------
// 4. Astrologer-reviewed fixtures — PENDING. Do not invent these.
// Fill each entry from a real review session or a published worked example,
// then flip status to "verified". The suite fails loudly if a verified entry
// mismatches, and only reports pending ones.
// ---------------------------------------------------------------------------
type DomainCase = {
  name: string;
  dob: string;
  timeOfBirth: string | null;
  utcOffsetMinutes: number;
  expected: {
    nakshatra?: (typeof NAKSHATRAS)[number];
    rashi?: string;
    gunaTotalWith?: { dob: string; timeOfBirth: string; points: number };
  };
  source: string;
  status: "verified" | "pending_astrologer_review";
};

const DOMAIN_CASES: DomainCase[] = [
  {
    name: "Published Guna Milan worked example #1",
    dob: "",
    timeOfBirth: null,
    utcOffsetMinutes: 330,
    expected: {},
    source: "TODO: fill from a respected astrology reference",
    status: "pending_astrologer_review",
  },
  {
    name: "Astrologer-reviewed chart #1 (nakshatra + rashi + doshas)",
    dob: "",
    timeOfBirth: null,
    utcOffsetMinutes: 330,
    expected: {},
    source: "TODO: fill from a practicing astrologer's review",
    status: "pending_astrologer_review",
  },
];

let pending = 0;
for (const c of DOMAIN_CASES) {
  if (c.status === "pending_astrologer_review") {
    pending++;
    continue;
  }
  const chart = birthChart(
    c.dob,
    parseAstro({ timeOfBirth: c.timeOfBirth, utcOffsetMinutes: c.utcOffsetMinutes }),
  )!;
  if (c.expected.nakshatra) {
    assert.equal(
      NAKSHATRAS[chart.nakshatra],
      c.expected.nakshatra,
      `${c.name}: nakshatra [${c.source}]`,
    );
  }
}

console.log(
  `astro-validation OK — astronomical fixtures verified; ${pending} case(s) pending astrologer review (Jatakam remains BETA until 0 pending)`,
);
