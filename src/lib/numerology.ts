// Indian (Chaldean-style) numerology for matrimony compatibility. Pure and
// deterministic from date of birth. Same EngineContribution contract as astro.ts
// / porutham.ts, so the AI match layer consumes all three uniformly.
//
// Confident part: the digit reduction (Moolank / Bhagyank) is arithmetic.
// ⚠️ VERIFY-BEFORE-GO-LIVE: FRIENDSHIP (the number friend/neutral/enemy matrix)
// follows commonly published numerology, but sources differ — have it reviewed
// before it drives recommendations. Keep the "for guidance only" disclaimer.

import type { EngineContribution } from "./astro";

// Ruling planet per root number (trilingual-ready labels kept minimal here).
export const NUMBER_PLANET: Record<number, string> = {
  1: "Sun",
  2: "Moon",
  3: "Jupiter",
  4: "Rahu",
  5: "Mercury",
  6: "Venus",
  7: "Ketu",
  8: "Saturn",
  9: "Mars",
};

/** Reduce to a single digit 1..9 (9 preserved; 0 never occurs for valid DOBs). */
export function reduceDigits(n: number): number {
  let x = Math.abs(n);
  while (x > 9) {
    x = String(x)
      .split("")
      .reduce((s, d) => s + Number(d), 0);
  }
  return x === 0 ? 9 : x;
}

/** Moolank (psychic number) — from the day of the month. */
export function moolank(dob: string): number | null {
  const day = Number(dob.split("-")[2]);
  if (!day || day < 1 || day > 31) return null;
  return reduceDigits(day);
}

/** Bhagyank (destiny number) — from the full date of birth. */
export function bhagyank(dob: string): number | null {
  const digits = dob.replace(/-/g, "");
  if (!/^\d{8}$/.test(digits)) return null;
  return reduceDigits(digits.split("").reduce((s, d) => s + Number(d), 0));
}

// Friend / neutral / enemy between root numbers. Anything not listed as friend or
// enemy is neutral. Symmetry is not assumed — evaluated both directions.
const FRIENDS: Record<number, number[]> = {
  1: [1, 2, 3, 5, 6, 9],
  2: [1, 2, 3, 5],
  3: [1, 2, 3, 5, 6, 9],
  4: [1, 5, 6, 7, 8],
  5: [1, 2, 3, 4, 5, 6, 7, 9],
  6: [1, 3, 4, 5, 6, 7, 9],
  7: [1, 4, 5, 6],
  8: [3, 4, 5, 6],
  9: [1, 2, 3, 5, 6, 9],
};
const ENEMIES: Record<number, number[]> = {
  1: [8],
  2: [8, 9],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [1, 2],
  9: [],
};

type Rel = "friend" | "neutral" | "enemy";
function numRelation(a: number, b: number): Rel {
  if (FRIENDS[a]?.includes(b)) return "friend";
  if (ENEMIES[a]?.includes(b)) return "enemy";
  return "neutral";
}

/** A single pairing's strength, 0..1, from both directions. */
function pairStrength(a: number, b: number): number {
  const ab = numRelation(a, b);
  const ba = numRelation(b, a);
  const val = (r: Rel) => (r === "friend" ? 1 : r === "neutral" ? 0.5 : 0);
  return (val(ab) + val(ba)) / 2;
}

export type NumerologyMatch = EngineContribution & {
  bride: { moolank: number; bhagyank: number; moolankPlanet: string; bhagyankPlanet: string };
  groom: { moolank: number; bhagyank: number; moolankPlanet: string; bhagyankPlanet: string };
  moolankRelation: Rel;
  bhagyankRelation: Rel;
};

/**
 * Compatibility from two dates of birth (YYYY-MM-DD). Moolank pairing is weighted
 * a bit higher than Bhagyank, per common practice. Returns null if either DOB is
 * unparseable.
 */
export function numerologyCompatibility(brideDob: string, groomDob: string): NumerologyMatch | null {
  const bM = moolank(brideDob);
  const bB = bhagyank(brideDob);
  const gM = moolank(groomDob);
  const gB = bhagyank(groomDob);
  if (bM == null || bB == null || gM == null || gB == null) return null;

  const moolankStrength = pairStrength(bM, gM);
  const bhagyankStrength = pairStrength(bB, gB);
  const combined = moolankStrength * 0.6 + bhagyankStrength * 0.4; // 0..1

  const moolankRelation = numRelation(bM, gM);
  const bhagyankRelation = numRelation(bB, gB);

  const reasons: string[] = [];
  if (moolankStrength >= 1) reasons.push(`Psychic numbers ${bM} & ${gM} are friendly`);
  if (bhagyankStrength >= 1) reasons.push(`Destiny numbers ${bB} & ${gB} are friendly`);
  const blockers: string[] = [];
  if (moolankStrength === 0) blockers.push(`Psychic numbers ${bM} & ${gM} are in conflict`);
  if (bhagyankStrength === 0) blockers.push(`Destiny numbers ${bB} & ${gB} are in conflict`);

  const planet = (n: number) => NUMBER_PLANET[n];
  return {
    score: Math.round(combined * 100),
    confidence: 60, // numerology is advisory; kept modest so it never dominates the match
    reasons,
    blockers,
    missingData: [],
    bride: { moolank: bM, bhagyank: bB, moolankPlanet: planet(bM), bhagyankPlanet: planet(bB) },
    groom: { moolank: gM, bhagyank: gB, moolankPlanet: planet(gM), bhagyankPlanet: planet(gB) },
    moolankRelation,
    bhagyankRelation,
  };
}
