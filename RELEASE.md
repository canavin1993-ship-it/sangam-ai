# v1.0 Release Checklist

Shared definition of "ready." Engineering gates are green as of `v1.0-rc1`;
product gates below require operator action.

## Engineering gates — ✅ done (verified at v1.0-rc1)

| Area | Status | Verified by |
| --- | --- | --- |
| Code quality (tsc, eslint 0 errors, no `any`) | ✅ | CI battery |
| Build (vite + nitro) | ✅ | `npm run build` |
| Correctness checks | ✅ | `scripts/selfcheck.ts` |
| Recommendation quality | ✅ | `scripts/eval.ts` |
| Astro validation (astronomical) | ✅ | `scripts/astro-validation.ts` |

Run all three suites:

```sh
for s in selfcheck eval astro-validation; do
  node_modules/lovable-tagger/node_modules/.bin/esbuild "scripts/$s.ts" \
    --bundle --format=esm --platform=node > "/tmp/$s.mjs" && node "/tmp/$s.mjs"
done
```

## Product gates — ⏳ operator actions

### 1. Apply migrations (in this order, via Lovable SQL editor or `supabase db push`)

1. `supabase/migrations/20260702120000_matches_write_policy.sql` — **production bug fix**: the AI-compatibility cache has never persisted; every request pays for a model call until this lands.
2. `supabase/migrations/20260702150000_profile_events.sql` — dismiss/hide/seen tracking (recommendations degrade gracefully until applied).
3. `supabase/migrations/20260702170000_profiles_astro.sql` — Jatakam birth details.

### 2. Regenerate DB types

Regenerate `src/integrations/supabase/types.ts` (Lovable does this on sync, or
`supabase gen types typescript`). Then delete the `as never` casts in
`ranking.queries.ts`, `me.tsx`, `profile.$id.tsx`, `matching.functions.ts`
(each is marked with a comment).

### 3. Verify cache lifecycle end to end (needs a test login)

1. View a profile's AI compatibility → expect model call + cache write (no console warning).
2. View again → expect `cached: true`, no model call.
3. Edit either profile's preferences → view again → expect recomputation.
4. View once more → expect cache hit on the new result.

### 4. Usability testing with representative users

Onboarding → partner preferences → discover → profile → interest flow.

### 5. Astrologer validation (Jatakam stays **Beta** until done)

Fill the two `pending_astrologer_review` fixtures in
`scripts/astro-validation.ts` with real reviewed charts (expected nakshatra,
rashi, guna total, doshas), flip `status` to `"verified"`, re-run the suite.
Known approximations to review: whole-sign vashya, simplified yoni matrix,
truncated lunar series (~0.1°), linear Lahiri ayanamsa.

### 6. Deploy + observe

Deploy the RC (`npm run build`, then Vercel project `sangam-ai` or
`npx nitro deploy --prebuilt`). Post-deploy, the next engineering iteration is
observability (cache hit rate, recommendation latency, verification funnel,
birth-data completion) — metrics before more features.

## Go / No-Go

**Go** when ALL of:

- [ ] All three migrations applied (in order)
- [ ] Generated DB types refreshed; `as never` casts removed
- [ ] Cache lifecycle verified end to end (4 steps above)
- [ ] `tsc --noEmit` — zero errors
- [ ] `eslint .` — zero errors
- [ ] `npm run build` passes
- [ ] selfcheck passes
- [ ] eval corpus passes
- [ ] astro-validation passes (Beta exceptions documented as pending, not failing)
- [ ] Smoke test on the production deployment (sign up → onboard → discover → profile → interest)

**No-Go** if ANY of:

- Any migration unapplied
- Compatibility cache writes still failing (console warning from `matching.functions.ts`)
- Generated types stale (casts still present)
- Recommendation eval regresses
- A `verified` astrologer fixture fails
- Production smoke test reveals a blocking issue

## After all gates: v1.1

Numerology engine (same evidentiary standard: deterministic, stated method,
AI interprets, validation corpus), then family workflows, engagement, premium.
