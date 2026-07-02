import { z } from "zod";

// Deterministic Jatakam engine: birth data → sidereal moon → nakshatra/rashi
// → ashta-koota Guna Milan. Pure module; the AI layer CONSUMES these outputs.
// Derived values are recomputed, never stored (raw inputs live in
// profiles.astro JSONB, versioned like partner_expectations).

// ---------------------------------------------------------------------------
// Birth data schema (stored in profiles.astro)
// ---------------------------------------------------------------------------
export const AstroSchema = z
  .object({
    schemaVersion: z.literal(1).catch(1),
    // date of birth stays in profiles.date_of_birth — single source of truth
    timeOfBirth: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .catch(null),
    placeOfBirth: z.string().trim().nullable().catch(null),
    utcOffsetMinutes: z.number().int().min(-720).max(840).catch(330), // default IST
  })
  .passthrough();

export type AstroData = z.infer<typeof AstroSchema>;
export const ASTRO_DEFAULTS: AstroData = AstroSchema.parse({});

export function parseAstro(json: unknown): AstroData {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return { ...ASTRO_DEFAULTS };
  return AstroSchema.parse(json);
}

export function mergeAstro(stored: unknown, edits: Partial<AstroData>): AstroData {
  const base = stored != null && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  return AstroSchema.parse({ ...base, ...edits, schemaVersion: 1 });
}

// ---------------------------------------------------------------------------
// Moon position — truncated Meeus (Astronomical Algorithms ch. 47).
// ponytail: 16 largest periodic terms ≈ 0.1° accuracy; a nakshatra spans
// 13°20', so only births within ~0.1° of a boundary are at risk — confidence
// reflects that. Upgrade path: full ELP term set or Swiss Ephemeris service.
// ---------------------------------------------------------------------------
const rad = (d: number) => (d * Math.PI) / 180;
const norm360 = (d: number) => ((d % 360) + 360) % 360;

export function julianDay(utcMs: number): number {
  return utcMs / 86_400_000 + 2440587.5;
}

export function moonTropicalLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
  const D = rad(norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T));
  const M = rad(norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T));
  const Mp = rad(norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T));
  const F = rad(norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T));
  const E = 1 - 0.002516 * T - 0.0000074 * T * T; // eccentricity damping for M terms

  // [coefficient in degrees, D, M, M', F] — largest terms of Σl
  const terms: Array<[number, number, number, number, number]> = [
    [6.288774, 0, 0, 1, 0],
    [1.274027, 2, 0, -1, 0],
    [0.658314, 2, 0, 0, 0],
    [0.213618, 0, 0, 2, 0],
    [-0.185116, 0, 1, 0, 0],
    [-0.114332, 0, 0, 0, 2],
    [0.058793, 2, 0, -2, 0],
    [0.057066, 2, -1, -1, 0],
    [0.053322, 2, 0, 1, 0],
    [0.045758, 2, -1, 0, 0],
    [-0.040923, 0, 1, -1, 0],
    [-0.03472, 1, 0, 0, 0],
    [-0.030383, 0, 1, 1, 0],
    [0.015327, 2, 0, 0, -2],
    [-0.012528, 0, 0, 1, 2],
    [0.01098, 0, 0, 1, -2],
  ];
  let sum = 0;
  for (const [coef, d, m, mp, f] of terms) {
    const eFactor = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sum += coef * eFactor * Math.sin(d * D + m * M + mp * Mp + f * F);
  }
  return norm360(L + sum);
}

/** Lahiri ayanamsa, linear approximation around J2000 (≈0.01°/decade error). */
export function lahiriAyanamsa(jd: number): number {
  return 23.85675 + (0.013969 * (jd - 2451545.0)) / 365.25;
}

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const RASHIS = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrishchika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
] as const;

export type BirthChart = {
  siderealMoon: number; // 0–360
  nakshatra: number; // 0–26
  rashi: number; // 0–11
  boundaryRisk: boolean; // within 0.25° of a nakshatra boundary
  approximateTime: boolean; // birth time unknown, noon assumed
};

/**
 * Moon chart from date of birth + astro data. Missing time of birth assumes
 * local noon — the moon moves ~13°/day (one nakshatra), so confidence drops.
 */
export function birthChart(dateOfBirth: string, astro: AstroData): BirthChart | null {
  const [y, mo, d] = dateOfBirth.split("-").map(Number);
  if (!y || !mo || !d) return null;
  const approximateTime = astro.timeOfBirth == null;
  const [hh, mm] = (astro.timeOfBirth ?? "12:00").split(":").map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, hh, mm) - astro.utcOffsetMinutes * 60_000;
  const jd = julianDay(utcMs);
  const sidereal = norm360(moonTropicalLongitude(jd) - lahiriAyanamsa(jd));
  const nakWidth = 360 / 27;
  const nakshatra = Math.floor(sidereal / nakWidth);
  const offsetInNak = sidereal - nakshatra * nakWidth;
  return {
    siderealMoon: sidereal,
    nakshatra,
    rashi: Math.floor(sidereal / 30),
    boundaryRisk: offsetInNak < 0.25 || nakWidth - offsetInNak < 0.25,
    approximateTime,
  };
}

// ---------------------------------------------------------------------------
// Ashta-koota tables (indexes follow NAKSHATRAS / RASHIS above)
// ---------------------------------------------------------------------------
type Gana = "deva" | "manushya" | "rakshasa";
type Nadi = "adi" | "madhya" | "antya";

const GANA: Gana[] = [
  "deva",
  "manushya",
  "rakshasa",
  "manushya",
  "deva",
  "manushya",
  "deva",
  "deva",
  "rakshasa",
  "rakshasa",
  "manushya",
  "manushya",
  "deva",
  "rakshasa",
  "deva",
  "rakshasa",
  "deva",
  "rakshasa",
  "rakshasa",
  "manushya",
  "manushya",
  "deva",
  "rakshasa",
  "rakshasa",
  "manushya",
  "manushya",
  "deva",
];
const YONI = [
  "horse",
  "elephant",
  "sheep",
  "snake",
  "snake",
  "dog",
  "cat",
  "sheep",
  "cat",
  "rat",
  "rat",
  "cow",
  "buffalo",
  "tiger",
  "buffalo",
  "tiger",
  "deer",
  "deer",
  "dog",
  "monkey",
  "mongoose",
  "monkey",
  "lion",
  "horse",
  "lion",
  "cow",
  "elephant",
];
const NADI: Nadi[] = [
  "adi",
  "madhya",
  "antya",
  "antya",
  "madhya",
  "adi",
  "adi",
  "madhya",
  "antya",
  "antya",
  "madhya",
  "adi",
  "adi",
  "madhya",
  "antya",
  "antya",
  "madhya",
  "adi",
  "adi",
  "madhya",
  "antya",
  "antya",
  "madhya",
  "adi",
  "adi",
  "madhya",
  "antya",
];
// Sworn-enemy yoni pairs (0 points); same yoni 4; otherwise neutral 2.
// ponytail: full 14×14 yoni matrix if a pandit review requires finer grading.
const YONI_ENEMIES: Array<[string, string]> = [
  ["cow", "tiger"],
  ["elephant", "lion"],
  ["horse", "buffalo"],
  ["dog", "deer"],
  ["snake", "mongoose"],
  ["monkey", "sheep"],
  ["cat", "rat"],
];

type Planet = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
const RASHI_LORD: Planet[] = [
  "mars",
  "venus",
  "mercury",
  "moon",
  "sun",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "saturn",
  "jupiter",
];
const FRIENDS: Record<Planet, Planet[]> = {
  sun: ["moon", "mars", "jupiter"],
  moon: ["sun", "mercury"],
  mars: ["sun", "moon", "jupiter"],
  mercury: ["sun", "venus"],
  jupiter: ["sun", "moon", "mars"],
  venus: ["mercury", "saturn"],
  saturn: ["mercury", "venus"],
};
const ENEMIES: Record<Planet, Planet[]> = {
  sun: ["venus", "saturn"],
  moon: [],
  mars: ["mercury"],
  mercury: ["moon"],
  jupiter: ["mercury", "venus"],
  venus: ["sun", "moon"],
  saturn: ["sun", "moon", "mars"],
};
// Varna rank by rashi (3 Brahmin … 0 Shudra)
const VARNA_RANK = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
// Vashya group by rashi. ponytail: whole-sign approximation of the classical
// half-sign splits (Sagittarius/Capricorn); refine if pandit review requires.
type Vashya = "chatushpada" | "manava" | "jalachara" | "vanachara" | "keeta";
const VASHYA: Vashya[] = [
  "chatushpada",
  "chatushpada",
  "manava",
  "jalachara",
  "vanachara",
  "manava",
  "manava",
  "keeta",
  "chatushpada",
  "chatushpada",
  "manava",
  "jalachara",
];
const VASHYA_POINTS: Record<Vashya, Record<Vashya, number>> = {
  chatushpada: { chatushpada: 2, manava: 1, jalachara: 1, vanachara: 0, keeta: 1 },
  manava: { chatushpada: 1, manava: 2, jalachara: 0.5, vanachara: 0, keeta: 1 },
  jalachara: { chatushpada: 1, manava: 0.5, jalachara: 2, vanachara: 1, keeta: 1 },
  vanachara: { chatushpada: 0, manava: 0, jalachara: 1, vanachara: 2, keeta: 0 },
  keeta: { chatushpada: 1, manava: 1, jalachara: 1, vanachara: 0, keeta: 2 },
};
const GANA_POINTS: Record<Gana, Record<Gana, number>> = {
  deva: { deva: 6, manushya: 6, rakshasa: 1 },
  manushya: { deva: 5, manushya: 6, rakshasa: 0 },
  rakshasa: { deva: 1, manushya: 0, rakshasa: 6 },
};

function relation(a: Planet, b: Planet): "friend" | "enemy" | "neutral" {
  if (FRIENDS[a].includes(b)) return "friend";
  if (ENEMIES[a].includes(b)) return "enemy";
  return "neutral";
}

function grahaMaitriPoints(a: Planet, b: Planet): number {
  if (a === b) return 5;
  const ab = relation(a, b);
  const ba = relation(b, a);
  if (ab === "friend" && ba === "friend") return 5;
  if ((ab === "friend" && ba === "neutral") || (ba === "friend" && ab === "neutral")) return 4;
  if (ab === "neutral" && ba === "neutral") return 3;
  if ((ab === "friend" && ba === "enemy") || (ba === "friend" && ab === "enemy")) return 1;
  if ((ab === "neutral" && ba === "enemy") || (ba === "neutral" && ab === "enemy")) return 0.5;
  return 0;
}

function taraPoints(fromNak: number, toNak: number): number {
  const count = (((toNak - fromNak + 27) % 27) + 1) % 9 || 9;
  return [3, 5, 7].includes(count) ? 0 : 1.5;
}

// ---------------------------------------------------------------------------
// Guna Milan — engine contribution contract shared with future engines
// ---------------------------------------------------------------------------
export type EngineContribution = {
  score: number; // normalized 0–100
  confidence: number; // 0–100
  reasons: string[];
  blockers: string[];
  missingData: string[];
};

export type GunaMilan = EngineContribution & {
  totalPoints: number; // 0–36
  kootas: Array<{ name: string; points: number; max: number; note: string }>;
  groomChart: { nakshatra: string; rashi: string };
  brideChart: { nakshatra: string; rashi: string };
};

export function gunaMilan(groom: BirthChart, bride: BirthChart): GunaMilan {
  const gN = groom.nakshatra;
  const bN = bride.nakshatra;
  const gR = groom.rashi;
  const bR = bride.rashi;

  const varna = VARNA_RANK[gR] >= VARNA_RANK[bR] ? 1 : 0;
  const vashya = VASHYA_POINTS[VASHYA[gR]][VASHYA[bR]];
  const tara = taraPoints(bN, gN) + taraPoints(gN, bN);
  const sameYoni = YONI[gN] === YONI[bN];
  const enemyYoni = YONI_ENEMIES.some(
    ([x, y]) => (YONI[gN] === x && YONI[bN] === y) || (YONI[gN] === y && YONI[bN] === x),
  );
  const yoni = sameYoni ? 4 : enemyYoni ? 0 : 2;
  const maitri = grahaMaitriPoints(RASHI_LORD[gR], RASHI_LORD[bR]);
  const gana = GANA_POINTS[GANA[gN]][GANA[bN]];
  const diff = (gR - bR + 12) % 12;
  const bhakootDosha = [1, 11, 4, 8, 5, 7].includes(diff);
  const bhakoot = bhakootDosha ? 0 : 7;
  const nadiDosha = NADI[gN] === NADI[bN];
  const nadi = nadiDosha ? 0 : 8;

  const kootas = [
    { name: "Varna", points: varna, max: 1, note: "spiritual compatibility" },
    { name: "Vashya", points: vashya, max: 2, note: "mutual influence" },
    { name: "Tara", points: tara, max: 3, note: "birth-star fortune" },
    { name: "Yoni", points: yoni, max: 4, note: "nature & temperament" },
    { name: "Graha Maitri", points: maitri, max: 5, note: "mental compatibility" },
    { name: "Gana", points: gana, max: 6, note: "temperament class" },
    { name: "Bhakoot", points: bhakoot, max: 7, note: "emotional & material harmony" },
    { name: "Nadi", points: nadi, max: 8, note: "health & progeny" },
  ];
  const totalPoints = kootas.reduce((s, k) => s + k.points, 0);

  const blockers: string[] = [];
  if (nadiDosha)
    blockers.push(
      `Nadi dosha: both share the ${NADI[gN]} nadi (0/8) — traditionally significant; consult an astrologer.`,
    );
  if (bhakootDosha)
    blockers.push(
      `Bhakoot dosha: rashi positions form an inauspicious ${diff}/${12 - diff} pairing (0/7).`,
    );
  if (enemyYoni)
    blockers.push(
      `Yoni conflict: ${YONI[gN]} and ${YONI[bN]} are traditionally adversarial (0/4).`,
    );

  const reasons = kootas
    .filter((k) => k.points >= k.max * 0.75)
    .map((k) => `${k.name} ${k.points}/${k.max} — strong ${k.note}`);

  const missingData: string[] = [];
  let confidence = 90; // truncated ephemeris, whole-sign vashya
  for (const [chart, who] of [
    [groom, "groom"],
    [bride, "bride"],
  ] as const) {
    if (chart.approximateTime) {
      confidence -= 25;
      missingData.push(
        `Exact birth time for ${who} (noon assumed — the moon can cross a nakshatra in a day)`,
      );
    }
    if (chart.boundaryRisk) confidence -= 10;
  }
  missingData.push(
    "Manglik & dosha analysis requires full chart (Mars position and ascendant) — not yet supported",
  );

  return {
    score: Math.round((totalPoints / 36) * 100),
    confidence: Math.max(confidence, 20),
    reasons,
    blockers,
    missingData,
    totalPoints: Math.round(totalPoints * 2) / 2,
    kootas,
    groomChart: { nakshatra: NAKSHATRAS[gN], rashi: RASHIS[gR] },
    brideChart: { nakshatra: NAKSHATRAS[bN], rashi: RASHIS[bR] },
  };
}
