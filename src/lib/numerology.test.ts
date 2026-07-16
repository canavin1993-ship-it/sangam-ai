// Runnable self-check for numerology. Run: bun src/lib/numerology.test.ts
import { reduceDigits, moolank, bhagyank, numerologyCompatibility } from "./numerology";

let n = 0;
const ok = (cond: boolean, msg: string) => {
  n++;
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
};

// Reduction arithmetic.
ok(reduceDigits(23) === 5, "23 → 5");
ok(reduceDigits(9) === 9, "9 stays 9");
ok(reduceDigits(19) === 1, "19 → 1+9=10 → 1");
ok(reduceDigits(18) === 9, "18 → 9");

// Moolank = day; Bhagyank = full DOB. 1990-11-23: day 23→5; sum 1+9+9+0+1+1+2+3=26→8.
ok(moolank("1990-11-23") === 5, "moolank of 23rd = 5");
ok(bhagyank("1990-11-23") === 8, "bhagyank of 1990-11-23 = 8");

// Bad input → null, not a throw.
ok(moolank("not-a-date") === null, "bad dob ⇒ null moolank");
ok(numerologyCompatibility("1990-11-23", "bad") === null, "bad dob ⇒ null match");

// A real pairing returns a bounded, deterministic score.
const m = numerologyCompatibility("1990-11-23", "1992-04-14")!;
ok(m.score >= 0 && m.score <= 100, "score within 0..100");
ok(
  numerologyCompatibility("1990-11-23", "1992-04-14")!.score === m.score,
  "deterministic for identical inputs",
);
ok(m.bride.moolankPlanet === "Mercury", "moolank 5 ⇒ Mercury");

// Conflict shows up as a blocker (1 vs 8 are enemies).
const conflict = numerologyCompatibility("1990-11-01", "1990-11-08")!; // moolank 1 vs 8
ok(conflict.blockers.length > 0, "enemy psychic numbers surface a blocker");

console.log(`✓ all ${n} numerology checks passed`);
