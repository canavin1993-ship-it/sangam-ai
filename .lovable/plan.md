
# Jangama Matrimony — Product & Architecture Plan

Positioning: **The trusted AI-powered matrimony platform for the global Jangama (Veerashaiva-Lingayat) community.** Family-first workflows + Betterhalf-grade AI compatibility + verified-only trust layer. Web + PWA (mobile-ready). Built on Lovable's TanStack Start stack with Lovable Cloud (Postgres/auth/storage) and Lovable AI Gateway.

## 1. Competitor gap analysis (condensed)

| Platform | Strength | Weakness we exploit |
|---|---|---|
| Shaadi.com | Scale, brand | Fake profiles, aggressive upsell, dated UX, weak AI |
| BharatMatrimony | Community sub-brands | Cluttered, poor mobile, spammy calls |
| Jeevansathi | Video profiles | Limited verification, generic matching |
| Betterhalf | AI + modern UX | Singles-only, weak for parents/family, no niche community depth |
| Community sites (Jangama Sangha etc.) | Trust, community | Tiny catalog, no tech, no verification, no AI |

**Our wedge for Jangama community:**
1. **Verified-only** — no profile appears in search until ID + selfie + mobile verified.
2. **Dual mode** — Singles mode (Tinder-like discovery, AI chat) + Parents mode (biodata cards, shortlists, family chat room).
3. **AI compatibility** beyond caste — Guna + personality + values + lifestyle score with plain-English "why you match".
4. **Jangama-native fields** — sub-sect (Panchamasali, Banajiga, etc.), Guru lineage / Ayya, Ishtalinga practice, gotra, veg-only default, native district (N/S Karnataka, Maharashtra border, Telangana, Kerala Lingayat pockets, NRI diaspora).
5. **Family workspace** — shared shortlist, in-app family video call, "introduce families" flow.
6. **Kannada-first + English + Hindi + Marathi + Telugu**.

## 2. Product roadmap (phased)

**Phase 1 — Foundation (this build cycle)**
- Design system + landing page (Kannada/English toggle)
- Auth: email + password + OTP (SMS integration stubbed for MSG91 keys)
- Profile creation wizard (multi-step, Jangama-specific fields)
- Photo upload with privacy blur
- Browse + search + filters
- AI compatibility score (Lovable AI Gateway)
- Interest send/accept/reject
- Basic 1:1 chat (post-mutual-interest)
- Verification badges (mobile, email, photo — manual admin approve first)

**Phase 2**
- Kundli/Guna matching engine
- Family/Parent mode + shared shortlists
- Video profile intros
- Government ID + AI selfie face-match (Lovable AI vision)
- Fraud/duplicate detection
- Razorpay subscriptions (Free / Premium / Elite / Assisted)
- Admin panel: approvals, reports, fraud queue

**Phase 3**
- Video calling (WebRTC via LiveKit/Daily)
- WhatsApp notifications (Meta Cloud API)
- AI biodata generator, AI conversation coach
- Relationship-manager CRM (assisted matchmaking)
- Native mobile wrapper (Capacitor)
- Elasticsearch for advanced search at scale

## 3. Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Client: TanStack Start (React 19, Vite, Tailwind v4)   │
│  - SSR route tree, PWA-ready, i18n (kn/en/hi/mr/te)     │
└───────────────┬─────────────────────────────────────────┘
                │ typed RPC (createServerFn) + REST (/api)
┌───────────────▼─────────────────────────────────────────┐
│  Server (Cloudflare Worker runtime)                     │
│  - Auth middleware (Supabase JWT)                       │
│  - AI matching, moderation, notifications               │
│  - Public webhooks: /api/public/razorpay,/msg91         │
└───┬──────────────┬──────────────┬──────────────┬────────┘
    │              │              │              │
┌───▼───┐   ┌──────▼─────┐  ┌─────▼─────┐  ┌─────▼────┐
│Postgres│  │  Storage   │  │ Lovable AI │  │ 3rd party │
│(Cloud) │  │  buckets   │  │  Gateway   │  │ MSG91,    │
│ + RLS  │  │photos/docs │  │(Gemini 3)  │  │ Razorpay, │
└────────┘   └────────────┘  └────────────┘  │ WhatsApp  │
                                             └───────────┘
```

## 4. Database schema (Phase 1)

```text
profiles(id PK=auth.uid, full_name, gender, dob, height_cm,
         mother_tongue, religion='Lingayat', sub_sect, gotra,
         guru_lineage, ishtalinga_practicing, marital_status,
         education, profession, annual_income_inr, city,
         state, country, native_district, diet, drinking,
         smoking, about, partner_expectations jsonb,
         created_by uuid, on_behalf_of enum('self','son','daughter','sibling','relative'),
         profile_status enum('draft','pending','active','hidden','banned'),
         is_verified bool, created_at, updated_at)

photos(id, profile_id FK, url, is_primary, is_private, moderation_status)

user_roles(user_id, role enum('user','moderator','admin'))  -- separate table

verifications(id, profile_id, type enum('mobile','email','id','selfie','face_match'),
              status, evidence_url, verified_at, verified_by)

interests(id, from_profile, to_profile, status enum('sent','accepted','declined','withdrawn'),
          created_at, responded_at, UNIQUE(from,to))

matches(id, profile_a, profile_b, ai_score int, ai_reason jsonb,
        guna_score int, created_at)

conversations(id, profile_a, profile_b, created_at, last_message_at)
messages(id, conversation_id, sender_id, body, created_at, read_at)

shortlists(id, owner_id, profile_id, note, UNIQUE(owner,profile))
family_members(id, profile_id, member_user_id, role enum('parent','sibling'))

blocks(blocker_id, blocked_id, reason, created_at)
reports(id, reporter_id, reported_profile, reason, status, created_at)

subscriptions(id, user_id, plan enum('free','premium','elite','assisted'),
              status, provider, provider_ref, current_period_end)
payments(id, user_id, amount_paise, currency, provider, provider_ref, status, created_at)

notifications(id, user_id, type, payload jsonb, read_at, created_at)
audit_logs(id, actor_id, action, target, meta jsonb, created_at)
```

Roles table + `has_role()` SECURITY DEFINER function (per Lovable rule).
RLS on every table. GRANTs to `authenticated` / `service_role` in same migration.

## 5. AI matching engine (Phase 1 shape)

1. Candidate generation: SQL filter by hard constraints (gender, age band, sub-sect if required, diet, marital status, location radius).
2. Feature scoring (server function): profile vectors (values, lifestyle, career stage, family expectations) → cosine similarity.
3. LLM re-rank + explain: Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output → `{score:0-100, strengths:[], considerations:[], summary}`.
4. Guna score (Phase 2): classical Ashtakoot from DOB/time/place using swisseph WASM.

## 6. Route map (TanStack)

```text
/                        landing (public, Kannada/English)
/about  /pricing  /trust  /contact  /blog
/auth                    signup + login
/onboarding/*            profile wizard (protected)
/_authenticated/
  /discover              swipe/browse
  /search                filters
  /profile/$id           view profile
  /me                    my profile
  /interests             sent/received
  /messages              conv list
  /messages/$id          chat
  /shortlist
  /family                parent mode
  /settings/*            privacy, verification, subscription
/_admin/                 admin panel (has_role='admin')
/api/public/webhooks/razorpay
/api/public/webhooks/msg91
/sitemap.xml  /robots.txt
```

## 7. Trust & safety

- Verified-only visibility toggle default ON.
- Photo blur until interest accepted.
- Rate limiting on interest send and search.
- AI moderation on chat + profile text (Gemini structured classification).
- Duplicate detection: phone hash, photo pHash.
- DPDP-compliant: consent log, data export, delete-account flow.

## 8. Monetization

| Plan | ₹/month | Features |
|---|---|---|
| Free | 0 | 5 interests/mo, blurred photos, basic filters |
| Premium | 799 | Unlimited interests, unblurred, AI compatibility |
| Elite | 2,499 | Priority listing, video intro, advanced filters, family workspace |
| Assisted | 14,999 one-time | Dedicated Jangama relationship manager, curated matches |

Razorpay subscriptions + webhooks. Free trial banners.

## 9. Integrations (wired now, keys later)

- **MSG91** — SMS OTP + transactional (`MSG91_AUTH_KEY`, template IDs).
- **Razorpay** — subscription + one-time (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- **Lovable AI Gateway** — matching, moderation, biodata writer (`LOVABLE_API_KEY` auto).
- Placeholder for WhatsApp Cloud API (Phase 3).

## 10. Design direction

Premium, warm, culturally-rooted: deep maroon + saffron + ivory + gold-leaf accents (not the tired pink/purple of Shaadi). Kannada display serif ("Tiro Kannada") for headings; Inter for body. Editorial photography, generous whitespace, Netflix-style horizontal shelves ("New this week", "Matches near you", "NRI Jangama"). Subtle Motion for React micro-animations. Mobile-first.

## 11. Deployment

Lovable hosting (Cloudflare Worker runtime). Preview + production URLs. Postgres via Lovable Cloud. Sitemap + robots + head metadata per Lovable rules.

## 12. What I'll build immediately after approval

**Turn 1 (this build):**
1. Enable Lovable Cloud.
2. Design system in `src/styles.css` (maroon/saffron/ivory palette, serif+sans pair).
3. Landing page (`/`) — hero, wedge, community, trust, pricing preview, footer. Kannada/English toggle.
4. `/auth` with email/password + Google, session listener.
5. Migration: `profiles`, `user_roles`, `has_role()`, RLS, GRANTs.
6. `/onboarding` 5-step wizard writing to `profiles`.
7. `_authenticated` layout + `/discover` skeleton reading real profiles.
8. sitemap.xml + robots.txt + head metadata.

**Turn 2:** photos + storage + verifications + interests + AI compatibility server fn.
**Turn 3:** chat + shortlists + family mode.
**Turn 4:** Razorpay + MSG91 wiring + admin panel.
**Turn 5+:** Kundli, video, WhatsApp, mobile wrapper — iterate against the plan.

Approve this and I'll start Turn 1.
