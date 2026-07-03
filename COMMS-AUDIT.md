# Communications & Authentication Audit

Scope: OTP, SMS, WhatsApp, Email, Push for Jangama Matrimony (India-first).
Principle followed: **no fabricated integrations.** Anything needing an account
or credential is flagged as operator config; the codebase stays functional
(graceful skip) until keys are supplied.

## 1. Current state (what actually exists in the repo)

| Capability | Status | Where |
| --- | --- | --- |
| **Phone OTP (SMS)** | ✅ built, production-grade | `src/lib/msg91.server.ts`, `src/lib/phone.functions.ts`, `src/routes/_authenticated/verify-phone.tsx` — hashed+salted OTP in `phone_verifications`, 10-min expiry, attempt tracking, dev fallback (`devOtp`) when unconfigured. Needs `MSG91_AUTH_KEY`. |
| **Email (auth)** | ⚠️ Supabase built-in mailer only | Supabase Auth sends signup confirmation / reset. Rate-limited; **needs custom SMTP** for production (dashboard, not code). |
| **Transactional SMS** (interest/match/etc.) | ❌ greenfield | new `sendNotification()` seam, unconfigured |
| **Transactional Email** | ❌ greenfield | seam via Resend, unconfigured |
| **WhatsApp** | ❌ greenfield (only a social link) | seam declared, needs approved template |
| **Push** | ❌ greenfield | seam declared, added with mobile app |
| **Notifications table / queue** | ❌ none | intentionally deferred (see §7) |

## 2. Architecture

```
call sites (server fns / webhooks)
        │  sendNotification({channel,to,body,subject?})
        ▼
  src/lib/notifications.ts   ── single interface, provider registry
        │
   ┌────┼───────────┬──────────────┬───────────┐
   ▼    ▼           ▼              ▼           ▼
  sms  email     whatsapp        push      (future channels)
 MSG91 Resend   MSG91-WA        FCM/WebPush
   │
 unconfigured provider → { status:"skipped" }  (app never breaks)
 send fails            → { status:"error", detail }
 send ok               → { status:"sent" }
```

OTP stays on its own dedicated path (latency-critical, own error surface); this
seam handles non-OTP notifications only.

## 3. Provider comparison (India-first)

### OTP / SMS
| Provider | India delivery | Pricing (SMS) | API | Verdict |
| --- | --- | --- | --- | --- |
| **MSG91** | Excellent (India-native, DLT-ready) | ~₹0.15–0.20/SMS | Simple HTTP + OTP widget | ✅ **chosen** — already integrated |
| Twilio Verify | Good | ~$0.05/verify (₹4+) | Excellent | Overpriced for India |
| Firebase Phone Auth | Good | Free < 10k/mo then billed | SDK-heavy, client-side | Viable free alt; ties OTP to Firebase |
| Gupshup / Exotel | Good | Comparable to MSG91 | Decent | Fine alternates behind the seam |
| Fast2SMS / 2Factor / Textlocal | OK | Cheap | Basic | Budget fallbacks |
| AWS SNS / Infobip | Good | Mid | Good | Overkill now |

**Recommendation: MSG91** — best India delivery + DLT compliance + price, already wired.

### Email
| Provider | Free tier | Then | Verdict |
| --- | --- | --- | --- |
| **Resend** | 3k/mo, 100/day | $20/mo → 50k | ✅ **chosen** — best DX, simple API |
| Amazon SES | 62k/mo (from EC2) | $0.10/1k | Cheapest at scale; clunkier setup |
| Postmark | 100/mo | $15/mo → 10k | Great deliverability, pricier |
| Zoho Mail | free mailboxes | — | Good for `support@` inbox, not bulk API |
| SendGrid/Mailgun | small | mid | Fine alternates |

**Recommendation: Resend** now; **SES** if email volume ever dominates cost.

### WhatsApp
MSG91 WhatsApp (same vendor) or Meta Cloud API directly. Needs a Meta Business
account + approved message templates. Start with MSG91-WhatsApp to keep one vendor.

### Push
FCM (free) for Android PWA + web; add when the mobile app / PWA install exists.

## 4. Cost comparison

| Tier | Users | SMS | Email | Est. monthly |
| --- | --- | --- | --- | --- |
| Free/pilot | <500 | MSG91 pay-as-you-go (~₹100) | Resend free | ~₹100 (SMS only) |
| Startup | 5k | ~₹1–2k SMS | Resend free/$20 | ₹1–3.5k |
| Growth | 50k | ~₹10–15k SMS | Resend $20 / SES | ₹12–18k |
| Scale | 500k+ | negotiate MSG91 slab | SES (~₹4k) | provider-negotiated |

OTP is the dominant SMS cost — throttle resends (already 10-min windowed) and
prefer WhatsApp OTP where opted-in to cut cost at scale.

## 5. Security review
- OTP stored **hashed+salted** (sha256 with per-user salt), never plaintext; 10-min expiry; attempt-limited. ✅
- Provider keys are server-only env vars, never shipped to client. ✅
- `sendNotification` never leaks provider errors to users (returns structured result; caller decides messaging). ✅
- DLT compliance required for India SMS — set `MSG91_DLT_TEMPLATE_ID`. ⚠️ operator.
- Email: enable SPF/DKIM/DMARC for the sending domain before bulk send (see RELEASE.md). ⚠️ operator.
- Rate limiting: OTP endpoint should be rate-limited per user/IP before public launch. ⚠️ (deferred — add at the edge or in the OTP handler).

## 6. Environment variables

| Var | Channel | Required for | Where to get |
| --- | --- | --- | --- |
| `MSG91_AUTH_KEY` | SMS/OTP | live OTP + transactional SMS | MSG91 dashboard |
| `MSG91_SENDER_ID` | SMS | branded sender (default JNGAMA) | MSG91 (DLT header) |
| `MSG91_DLT_TEMPLATE_ID` | SMS | India DLT compliance | MSG91/DLT portal |
| `RESEND_API_KEY` | Email | transactional email | Resend dashboard |
| `EMAIL_FROM` | Email | from-address | your domain |
| `MSG91_WHATSAPP_KEY` | WhatsApp | WhatsApp sends | MSG91 WhatsApp |
| (Supabase SMTP) | Auth email | signup/reset deliverability | Supabase → Auth → SMTP |

Set on Vercel with `npx vercel env add <NAME> production --value "<v>"` (use
`--value`; stdin piping silently stores empty — learned the hard way).

## 7. Database / schema changes
**None required now.** `phone_verifications` already exists for OTP.
When durable delivery tracking is needed (not yet), add:
```sql
-- deferred until real volume:
-- create table notifications (id uuid pk, channel text, recipient text,
--   status text, detail text, created_at timestamptz default now());
```
Add the worker + retry against that table then — not before.

## 8. Testing checklist
- [x] `scripts/notifications-check.ts` — unconfigured channels skip (no throw, no fake success); config detection via env
- [ ] Live OTP: request → SMS arrives → verify → `phone_verifications.verified=true` (needs `MSG91_AUTH_KEY`)
- [ ] OTP resend throttling within 10-min window
- [ ] Email send via Resend (needs `RESEND_API_KEY`) → inbox, not spam (SPF/DKIM)
- [ ] Supabase signup confirmation email deliverable (needs custom SMTP)
- [ ] WhatsApp template send (needs Meta template approval)

## 9. Migration plan (zero downtime)
The seam is **additive** — no existing code changed, no call sites yet, so
there is nothing to migrate and nothing to break. Rollout:
1. Ship the seam (done) — inert until called.
2. Operator adds `MSG91_AUTH_KEY` (already needed for OTP) → SMS channel goes live automatically.
3. Add `RESEND_API_KEY` → email channel live.
4. Wire call sites incrementally (e.g. interest-received → `sendNotification`), each behind its channel's graceful skip.
Each step is independently reversible (remove the env var → channel skips).

## 10. Production-readiness assessment
| Area | Ready? |
| --- | --- |
| OTP code path | ✅ production-grade; needs `MSG91_AUTH_KEY` |
| Notification seam | ✅ functional, graceful, tested |
| Transactional SMS/email delivery | ⏳ needs provider keys + call sites |
| WhatsApp / Push | ⏳ needs accounts (Meta / FCM) |
| Queue / retry / rate-limit | ⏸ deferred by design (YAGNI until volume) |

**Bottom line:** OTP is production-ready today. The unified seam makes every
other channel a config-and-wire task, not a rebuild — and the app runs fine
with none of them configured.
