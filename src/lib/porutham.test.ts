// Runnable self-check for the Dasa Porutham engine. No framework — run with:
//   bun src/lib/porutham.test.ts   (or: npx tsx src/lib/porutham.test.ts)
// Exits non-zero on the first broken invariant.
import { dasaPorutham, PORUTHAM_META, RAJJU_GROUP, VEDHA_PAIRS } from "./porutham";

let n = 0;
const ok = (cond: boolean, msg: string) => {
  n++;
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
};

// Table integrity — every star must have exactly one rajju; vedha pairs symmetric.
ok(RAJJU_GROUP.length === 27 && RAJJU_GROUP.every(Boolean), "every nakshatra has a rajju group");
ok(new Set(VEDHA_PAIRS.flat()).size === VEDHA_PAIRS.length * 2, "vedha pairs use distinct stars");
ok(PORUTHAM_META.length === 10, "exactly 10 poruthams defined");

// Same star, same star: same gana + same yoni pass, but same rajju is a dosha.
const same = dasaPorutham({ nakshatra: 0 }, { nakshatra: 0 });
ok(same.poruthams.length === 10, "10 porutham lines");
ok(same.poruthams.find((p) => p.key === "rajju")!.status === "fail", "same star ⇒ rajju dosha");
ok(same.poruthams.find((p) => p.key === "yoni")!.status === "pass", "same star ⇒ yoni pass");
ok(same.total >= 0 && same.total <= 10, "total within 0..10");
ok(Number.isInteger(same.total * 2), "total is in 0.5 steps");

// Known vedha pair Ashwini(0)–Jyeshtha(17) ⇒ vedha dosha + a blocker.
const vp = dasaPorutham({ nakshatra: 0 }, { nakshatra: 17 });
ok(vp.poruthams.find((p) => p.key === "vedha")!.status === "fail", "Ashwini–Jyeshtha ⇒ vedha dosha");
ok(vp.blockers.some((b) => /vedha/i.test(b)), "vedha dosha surfaces as a blocker");

// Known same-rajju pair Ashwini(0)–Magha(9) (both 'pada') ⇒ rajju dosha.
ok(
  dasaPorutham({ nakshatra: 0 }, { nakshatra: 9 }).poruthams.find((p) => p.key === "rajju")!
    .status === "fail",
  "Ashwini–Magha ⇒ rajju dosha (both pada)",
);

// Determinism: same inputs, same score.
const a = dasaPorutham({ nakshatra: 3, rashi: 1 }, { nakshatra: 20, rashi: 9 });
const b = dasaPorutham({ nakshatra: 3, rashi: 1 }, { nakshatra: 20, rashi: 9 });
ok(a.total === b.total && a.score === b.score, "deterministic for identical inputs");

// Category thresholds track the total.
ok(
  same.category === (same.total >= 8 ? "Uttama" : same.total >= 5 ? "Madhyama" : "Adhama"),
  "category matches total thresholds",
);

// score is the 0..100 projection of total/10.
ok(a.score === Math.round((a.total / 10) * 100), "score = total/10 as percent");

// Nakshatra-only inputs flag approximate rashi + lower confidence.
ok(same.approximateRashi && same.confidence <= 70, "nakshatra-only ⇒ approximate rashi, capped confidence");

console.log(`✓ all ${n} porutham checks passed`);
