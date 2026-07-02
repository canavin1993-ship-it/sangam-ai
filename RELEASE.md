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

## Production audit findings (2026-07-02)

Verified against live infrastructure. Verification boundary: **no GoDaddy
account integration exists in this environment** — public DNS, WHOIS, SSL and
HTTP behavior were verified independently; account-only settings (auto-renew,
DNSSEC configuration, billing, email products) require the GoDaddy dashboard.

| Item | Status | Evidence / action |
| --- | --- | --- |
| DB migrations live | ✅ verified behaviorally | RLS writes exercised as authenticated/anon roles in rolled-back txns; non-participant forge rejected; anon sees 0 rows everywhere |
| Prod domain | ✅ `jangamamatrimony.com` | Registered 2026-07-01 (GoDaddy), A → Lovable `185.158.133.1`, valid GTS cert, HSTS |
| ⚠️ Brand collision | documented | `jangam`**`m`**`atrimony.com` (one keystroke away) is an 18-year-old CommunityMatrimony/Matrimony.com property in the same market. Recommend IP/trademark professional review before marketing spend. |
| 🔴 www broken | operator fix | DNS resolves but www is not a Lovable domain alias → no cert, TLS handshake fails. Fix: Lovable domain settings → add `www.jangamamatrimony.com`; then verify cert issuance and a permanent (301/308) redirect to apex. |
| 🔴 GitHub→Lovable sync | **release blocker** | Lovable editor stuck at Jul 1; commits waiting on `main`. Pull in Lovable UI, then Publish. Do NOT publish before sync. |
| 🟠 No MX records | operator fix | `support@` cannot receive mail. Configure forwarding/mail hosting; address removed from README until it works. |
| 🟡 SPF/DKIM absent | later | Add when the domain starts sending mail. DMARC (GoDaddy default, p=quarantine) present. |
| 🟠 Signup email on default mailer | operator fix | Email confirmation is REQUIRED at signup (verified via REST: no session until confirm), and Supabase's built-in mailer is heavily rate-limited. Configure custom SMTP (e.g. Resend/Postmark) in Supabase auth settings, then verify confirmation, password reset, and resend. |
| ✅ Live app REST E2E | verified 2026-07-02 | Against production with the real publishable key: signup, login, profile upsert, partner-expectations + astro writes, event insert all pass; cross-user forge updates 0 rows; test users deleted, prod state restored. |
| ✅ FK indexes | applied + `20260702210000` | 7 covering indexes on hot FK columns, applied to prod during audit. |
| Vercel migration | ❌ not recommended | Hosting verified healthy; only deficiency is the GitHub sync (UI fix). Revisit only if Lovable support confirms sync is unfixable. |
| SEO absolute URLs | ✅ fixed in 5e6477b | canonical, og:url, sitemap locs, Organization url |

Post-deploy SEO validation: Search Console + Bing Webmaster registration,
Rich Results Test, OG preview, live robots.txt + sitemap fetch.

## Verify the audit claims yourself (60 seconds)

Paste into the Lovable/Supabase SQL editor. Every row should read `true`:

```sql
SELECT
  (SELECT count(*)=3 FROM pg_policies WHERE tablename='matches')            AS cache_policy_applied,
  (SELECT count(*)=1 FROM information_schema.tables
    WHERE table_name='profile_events')                                      AS events_table_exists,
  (SELECT count(*)=1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='astro')                    AS astro_column_exists,
  (SELECT count(*)>=7 FROM pg_indexes
    WHERE schemaname='public' AND indexname LIKE 'idx_%')                   AS fk_indexes_applied,
  (SELECT count(*)=0 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity)    AS rls_on_all_tables,
  (SELECT count(*)=0 FROM auth.users
    WHERE email LIKE 'claude.prod.audit%')                                  AS audit_test_users_cleaned;
```

Non-DB claims, verified from your own machine:
- Sync behind: compare latest commit in the Lovable editor vs `git log origin/main -1`
- www broken: open `https://www.jangamamatrimony.com` (expect a TLS error until fixed)
- Both domains: `whois jangammatrimony.com | grep Creation` (2006, not yours) vs `whois jangamamatrimony.com` (2026-07-01, yours)

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
