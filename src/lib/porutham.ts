// South Indian Dasa Porutham (10-porutham) Guna matching — the tradition Telugu
// & Kannada (Jangama Veerashaiva-Lingayat) families actually use, as opposed to
// the North Indian 36-guna Ashta-Koota in astro.ts. Pure, deterministic module;
// the AI layer CONSUMES these outputs and never recomputes them.
//
// Reuses the ephemeris (birthChart) and the pan-Indian shared tables from
// astro.ts (Nakshatra/Rashi lists, Yoni, Gana, Rashi lords, planetary relations)
// so those 27-row tables live in exactly one place.
//
// ⚠️ VERIFY-BEFORE-GO-LIVE: the rule constants below (auspicious counts, Rajju /
// Vedha groupings, Vasya control table) follow commonly documented South Indian
// jyotisha, but regional and guru-parampare variants exist. Have a Jangama
// purohit sign off on RAJJU_GROUP, VEDHA_PAIRS, VASYA_OF and the Dina/Mahendra/
// Stree-Deergha count rules before this drives real recommendations. Keep the
// "reference only — consult a purohit" disclaimer in the UI.

import {
  NAKSHATRAS,
  RASHIS,
  GANA,
  YONI,
  YONI_ENEMIES,
  RASHI_LORD,
  relation,
  type BirthChart,
  type EngineContribution,
} from "./astro";

// ---------------------------------------------------------------------------
// Trilingual porutham metadata (EN / తెలుగు / ಕನ್ನಡ) — same 10 shown in the app.
// ---------------------------------------------------------------------------
export type PoruthamKey =
  | "dina"
  | "gana"
  | "mahendra"
  | "streeDeergha"
  | "yoni"
  | "rasi"
  | "rasyadhipathi"
  | "vasya"
  | "rajju"
  | "vedha";

export const PORUTHAM_META: Array<{
  key: PoruthamKey;
  en: string;
  te: string;
  ka: string;
  meaning: string;
}> = [
  { key: "dina", en: "Dina", te: "దిన", ka: "ದಿನ", meaning: "Health & longevity" },
  { key: "gana", en: "Gana", te: "గణ", ka: "ಗಣ", meaning: "Temperament & nature" },
  { key: "mahendra", en: "Mahendra", te: "మహేంద్ర", ka: "ಮಹೇಂದ್ರ", meaning: "Progeny & vitality" },
  { key: "streeDeergha", en: "Stree Deergha", te: "స్త్రీ దీర్ఘ", ka: "ಸ್ತ್ರೀ ದೀರ್ಘ", meaning: "Wife's welfare & prosperity" },
  { key: "yoni", en: "Yoni", te: "యోని", ka: "ಯೋನಿ", meaning: "Physical harmony" },
  { key: "rasi", en: "Rasi", te: "రాశి", ka: "ರಾಶಿ", meaning: "Moon-sign harmony (Bhakoot)" },
  { key: "rasyadhipathi", en: "Rasyadhipathi", te: "రాశ్యాధిపతి", ka: "ರಾಶ್ಯಾಧಿಪತಿ", meaning: "Lord-planet friendship" },
  { key: "vasya", en: "Vasya", te: "వశ్య", ka: "ವಶ್ಯ", meaning: "Mutual attraction" },
  { key: "rajju", en: "Rajju", te: "రజ్జు", ka: "ರಜ್ಜು", meaning: "Husband's longevity" },
  { key: "vedha", en: "Vedha", te: "వేధ", ka: "ವೇಧ", meaning: "Freedom from affliction" },
];

// ---------------------------------------------------------------------------
// South-Indian-specific tables (indexes follow astro.ts NAKSHATRAS 0..26)
// ---------------------------------------------------------------------------

// Rajju — 5 body-limb groups. Bride & groom in the SAME rajju is a dosha; the
// Siro (head) rajju is treated as the most serious. 6+6+6+6+3 = 27.
type Rajju = "pada" | "kati" | "nabhi" | "kantha" | "siro";
export const RAJJU_GROUP: Rajju[] = (() => {
  const g: Rajju[] = new Array(27);
  const set = (r: Rajju, idxs: number[]) => idxs.forEach((i) => (g[i] = r));
  set("pada", [0, 8, 9, 17, 18, 26]); // Ashwini Ashlesha Magha Jyeshtha Mula Revati
  set("kati", [1, 7, 10, 16, 19, 25]); // Bharani Pushya P.Phalguni Anuradha P.Ashadha U.Bhadrapada
  set("nabhi", [2, 6, 11, 15, 20, 24]); // Krittika Punarvasu U.Phalguni Vishakha U.Ashadha P.Bhadrapada
  set("kantha", [3, 5, 12, 14, 21, 23]); // Rohini Ardra Hasta Swati Shravana Shatabhisha
  set("siro", [4, 13, 22]); // Mrigashira Chitra Dhanishta
  return g;
})();

// Vedha (mutual affliction) nakshatra pairs. If the two stars form a vedha pair
// it is a dosha. 13 symmetric pairs cover 26 stars; Chitra (13) has no vedha.
export const VEDHA_PAIRS: Array<[number, number]> = [
  [0, 17], // Ashwini – Jyeshtha
  [1, 16], // Bharani – Anuradha
  [2, 15], // Krittika – Vishakha
  [3, 14], // Rohini – Swati
  [4, 22], // Mrigashira – Dhanishta
  [5, 21], // Ardra – Shravana
  [6, 20], // Punarvasu – Uttara Ashadha
  [7, 19], // Pushya – Purva Ashadha
  [8, 18], // Ashlesha – Mula
  [9, 26], // Magha – Revati
  [10, 25], // Purva Phalguni – Uttara Bhadrapada
  [11, 24], // Uttara Phalguni – Purva Bhadrapada
  [12, 23], // Hasta – Shatabhisha
];

// Vasya — signs each Rashi draws/controls (0..11 follow astro.ts RASHIS).
const VASYA_OF: number[][] = [
  [4, 7], // Mesha ← Simha, Vrischika
  [3, 6], // Vrishabha ← Karka, Tula
  [5], // Mithuna ← Kanya
  [7, 8], // Karka ← Vrischika, Dhanu
  [6], // Simha ← Tula
  [11, 2], // Kanya ← Meena, Mithuna
  [9, 5], // Tula ← Makara, Kanya
  [8], // Vrischika ← Dhanu
  [11], // Dhanu ← Meena
  [10, 0], // Makara ← Kumbha, Mesha
  [0], // Kumbha ← Mesha
  [9], // Meena ← Makara
];

// Gana pairings for porutham (pass / partial / fail). Same gana or the
// deva↔manushya pair is auspicious; any Rakshasa cross-pairing fails.
function ganaPoints(brideNak: number, groomNak: number): number {
  const b = GANA[brideNak];
  const g = GANA[groomNak];
  if (b === g) return 1;
  if ((b === "deva" && g === "manushya") || (b === "manushya" && g === "deva")) return 1;
  // manushya bride with rakshasa groom is sometimes tolerated; keep as partial.
  if (b === "manushya" && g === "rakshasa") return 0.5;
  return 0;
}

/** Inclusive count from star A to star B around the 27-star wheel (1..27). */
function starCount(from: number, to: number): number {
  return ((to - from + 27) % 27) + 1;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------
export type PoruthamStatus = "pass" | "partial" | "fail";
export type PoruthamLine = {
  key: PoruthamKey;
  points: number; // 0 | 0.5 | 1
  status: PoruthamStatus;
  detail: string;
};

export type DasaPorutham = EngineContribution & {
  total: number; // 0..10 (0.5 steps)
  outOf: 10;
  category: "Uttama" | "Madhyama" | "Adhama";
  poruthams: PoruthamLine[];
  bride: { nakshatra: string; rashi: string };
  groom: { nakshatra: string; rashi: string };
  approximateRashi: boolean; // rashi inferred from nakshatra only (no pada/birth time)
};

const status = (p: number): PoruthamStatus => (p >= 1 ? "pass" : p > 0 ? "partial" : "fail");

/**
 * Core engine. Works from Nakshatra (required) and Rashi (moon-sign). When
 * Rashi is unknown (nakshatra-only calculator) it is inferred from the star's
 * midpoint — approximate, since the true rashi depends on pada / birth time.
 */
export function dasaPorutham(
  bride: { nakshatra: number; rashi?: number },
  groom: { nakshatra: number; rashi?: number },
  opts?: { approximate?: boolean; confidence?: number },
): DasaPorutham {
  const bN = bride.nakshatra;
  const gN = groom.nakshatra;
  const approximateRashi = bride.rashi == null || groom.rashi == null;
  // Midpoint-of-star fallback: rashi containing the star's centre (13.333°/star).
  const rashiOfStar = (n: number) => Math.floor(((n + 0.5) * (360 / 27)) / 30) % 12;
  const bR = bride.rashi ?? rashiOfStar(bN);
  const gR = groom.rashi ?? rashiOfStar(gN);

  const lines: PoruthamLine[] = [];
  const add = (key: PoruthamKey, points: number, detail: string) =>
    lines.push({ key, points, status: status(points), detail });

  // 1. Dina — count bride★→groom★; auspicious when count mod 9 is even (0,2,4,6,8).
  const dinaCount = starCount(bN, gN);
  const dinaOk = dinaCount % 9 % 2 === 0;
  add("dina", dinaOk ? 1 : 0, `count ${dinaCount} from ${NAKSHATRAS[bN]} to ${NAKSHATRAS[gN]}`);

  // 2. Gana — temperament class.
  add("gana", ganaPoints(bN, gN), `${GANA[bN]} (bride) · ${GANA[gN]} (groom)`);

  // 3. Mahendra — count bride★→groom★ ∈ {4,7,10,13,16,19,22,25}.
  const mahendraOk = [4, 7, 10, 13, 16, 19, 22, 25].includes(dinaCount);
  add("mahendra", mahendraOk ? 1 : 0, `count ${dinaCount}`);

  // 4. Stree Deergha — bride★→groom★ should exceed 9 for the woman's welfare.
  add("streeDeergha", dinaCount > 9 ? 1 : 0, `count ${dinaCount} (>9 auspicious)`);

  // 5. Yoni — animal nature; same best, sworn-enemy worst.
  const sameYoni = YONI[bN] === YONI[gN];
  const enemyYoni = YONI_ENEMIES.some(
    ([x, y]) => (YONI[bN] === x && YONI[gN] === y) || (YONI[bN] === y && YONI[gN] === x),
  );
  add("yoni", sameYoni ? 1 : enemyYoni ? 0 : 0.5, `${YONI[bN]} · ${YONI[gN]}`);

  // 6. Rasi (Bhakoot) — dosha at 2/12 (diff 1,11) or 6/8 (diff 5,7).
  const diff = (gR - bR + 12) % 12;
  const rasiDosha = diff === 1 || diff === 11 || diff === 5 || diff === 7;
  add("rasi", rasiDosha ? 0 : 1, `${RASHIS[bR]} · ${RASHIS[gR]}${rasiDosha ? " (bhakoot dosha)" : ""}`);

  // 7. Rasyadhipathi — friendship of the two rashi lords.
  const lb = RASHI_LORD[bR];
  const lg = RASHI_LORD[gR];
  let rasyaPts: number;
  if (lb === lg) rasyaPts = 1;
  else {
    const ab = relation(lb, lg);
    const ba = relation(lg, lb);
    if (ab === "enemy" || ba === "enemy") rasyaPts = 0;
    else if (ab === "friend" || ba === "friend") rasyaPts = 1;
    else rasyaPts = 0.5;
  }
  add("rasyadhipathi", rasyaPts, `${lb} · ${lg}`);

  // 8. Vasya — mutual attraction via the rashi control table.
  const vasyaPts = VASYA_OF[bR].includes(gR) ? 1 : VASYA_OF[gR].includes(bR) ? 0.5 : 0;
  add("vasya", vasyaPts, `${RASHIS[bR]} ⇄ ${RASHIS[gR]}`);

  // 9. Rajju — same body-limb group is a dosha (Siro most serious).
  const sameRajju = RAJJU_GROUP[bN] === RAJJU_GROUP[gN];
  add(
    "rajju",
    sameRajju ? 0 : 1,
    sameRajju ? `both in ${RAJJU_GROUP[bN]} rajju (dosha)` : `${RAJJU_GROUP[bN]} · ${RAJJU_GROUP[gN]}`,
  );

  // 10. Vedha — mutual affliction pair.
  const vedha = VEDHA_PAIRS.some(([x, y]) => (x === bN && y === gN) || (y === bN && x === gN));
  add("vedha", vedha ? 0 : 1, vedha ? "vedha pair (dosha)" : "no vedha");

  const total = Math.round(lines.reduce((s, l) => s + l.points, 0) * 2) / 2;
  const category = total >= 8 ? "Uttama" : total >= 5 ? "Madhyama" : "Adhama";

  // Blockers: the doshas South Indian families weigh most heavily.
  const blockers: string[] = [];
  if (sameRajju && RAJJU_GROUP[bN] === "siro")
    blockers.push("Siro (head) Rajju dosha — both stars share the head rajju; traditionally serious.");
  else if (sameRajju) blockers.push(`Rajju dosha — both share the ${RAJJU_GROUP[bN]} rajju.`);
  if (rasiDosha) blockers.push(`Bhakoot dosha — ${RASHIS[bR]}/${RASHIS[gR]} form an inauspicious position.`);
  if (vedha) blockers.push(`Vedha dosha — ${NAKSHATRAS[bN]} and ${NAKSHATRAS[gN]} are vedha stars.`);
  if (enemyYoni) blockers.push(`Yoni conflict — ${YONI[bN]} and ${YONI[gN]} are adversarial.`);

  const meaningOf = (k: PoruthamKey) => PORUTHAM_META.find((m) => m.key === k)!.meaning;
  const reasons = lines.filter((l) => l.status === "pass").map((l) => `${l.key}: ${meaningOf(l.key)}`);

  const missingData: string[] = [];
  let confidence = opts?.confidence ?? 92;
  if (approximateRashi) {
    confidence = Math.min(confidence, 70);
    missingData.push(
      "Exact rashi needs birth star pada or birth time — moon-sign-dependent poruthams (Rasi, Rasyadhipathi, Vasya) are approximate.",
    );
  }
  if (opts?.approximate) confidence -= 10;

  return {
    score: Math.round((total / 10) * 100),
    confidence: Math.max(confidence, 20),
    reasons,
    blockers,
    missingData,
    total,
    outOf: 10,
    category,
    poruthams: lines,
    bride: { nakshatra: NAKSHATRAS[bN], rashi: RASHIS[bR] },
    groom: { nakshatra: NAKSHATRAS[gN], rashi: RASHIS[gR] },
    approximateRashi,
  };
}

/** Convenience wrapper for the profile flow: two computed birth charts. */
export function dasaPoruthamFromCharts(bride: BirthChart, groom: BirthChart): DasaPorutham {
  const approximate = bride.approximateTime || groom.approximateTime;
  return dasaPorutham(
    { nakshatra: bride.nakshatra, rashi: bride.rashi },
    { nakshatra: groom.nakshatra, rashi: groom.rashi },
    { approximate, confidence: 92 },
  );
}
