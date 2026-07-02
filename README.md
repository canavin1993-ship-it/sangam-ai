# 🏛️ Jangama Matrimony — AI-Assisted Matrimonial Platform

> A matrimonial platform for the Jangama Veerashaiva-Lingayat community, built
> on deterministic, explainable matching engines with AI interpretation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

Release status: **v1.0-rc1** — see [RELEASE.md](RELEASE.md) for the gate checklist.

## ✨ Features (as implemented)

### 🤖 Matching & recommendations
- **AI compatibility v2** — structured, explainable output (score, confidence,
  six category scores, green/red flags, conversation starters, missing info,
  recommendation), consuming both members' partner expectations; per-viewer
  directional caching with staleness invalidation
- **Structured partner preferences** — versioned JSONB (age/height ranges,
  sub-sect, location, education, profession, lifestyle, must-haves,
  deal-breakers), merge-safe saves
- **Ranked discover & search** — pure `recommend()` pipeline: exclusions
  (blocks, sent interests, dismissed/hidden) → eligibility → weighted ranking →
  seen-last freshness → diversity, with "Recommended because…" reasons
- **Interaction events** — dismiss/hide/profile-opened feedback loop

### 🪔 Jatakam (Beta)
- Deterministic Guna Milan (ashta-koota, /36) from birth details: truncated
  Meeus lunar theory, Lahiri ayanamsa, nakshatra/rashi, dosha blockers in
  plain language; the AI interprets these results, never invents them.
  **Beta until astrologer validation completes** (`scripts/astro-validation.ts`).

### ⭐ Trust & profile quality
- **Trust score** (0–100) from verifications, approved photos, family links,
  completeness, activity — only signals the owner is authorized to read
- **Profile completeness** with impact-ordered, data-driven suggestions

### 👨‍👩‍👧 Family & safety
- Family member invitations (parent/sibling/relative/matchmaker roles)
- Blocks, reports, verification workflow (mobile/email/ID/selfie), photo
  moderation, RLS on every table

### 💰 Monetization
- Premium tiers via Razorpay (order + webhook lifecycle)

### 🧪 Quality gates
- `scripts/selfcheck.ts` — correctness · `scripts/eval.ts` — recommendation
  quality personas · `scripts/astro-validation.ts` — domain validation

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Router, Tailwind CSS v4 |
| Backend | TanStack Start, Vite |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth + Firebase OTP |
| AI | Google Gemini via Lovable AI Gateway |
| Payments | Razorpay |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/canavin1993-ship-it/sangam-ai.git
cd sangam-ai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Fill in your credentials in .env
# See Environment Variables section below

# Push database migrations to Supabase
npx supabase db push

# Start development server
npm run dev
```

## 🔑 Environment Variables

Create a `.env` file with:

```env
# Supabase (Database & Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Razorpay (Payments)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx

# Lovable AI (Gemini)
LOVABLE_API_KEY=your-key

# Firebase (Phone OTP)
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## 🗄️ Database Setup

Apply all migrations in `supabase/migrations/` folder:

```bash
# Using Supabase CLI
npx supabase db push

# Or manually via Supabase Dashboard > SQL Editor
```

### Key Tables
- `profiles` - User profiles (incl. `partner_expectations`, `astro` JSONB)
- `photos` - Profile photos (moderated)
- `interests` / `shortlists` - Expressions of interest
- `matches` - Cached AI compatibility (per-viewer, directional)
- `profile_events` - Interaction feedback (dismiss/hide/opened)
- `conversations` / `messages` - Chat
- `family_members` - Family account links
- `verifications` / `reports` / `blocks` - Trust & safety
- `subscriptions` / `payment_events` - Paid plans

## 🌐 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/public/razorpay-webhook` | POST | Payment webhook |

AI compatibility, billing, phone verification, and landing stats run as
TanStack Start server functions in `src/lib/*.functions.ts` (not REST routes).

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/            # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase, Firebase, Lovable
├── lib/                # Engines & server functions
│   ├── matching.functions.ts   # AI compatibility v2 (server fn)
│   ├── ranking.ts / ranking.queries.ts  # recommend() pipeline
│   ├── astro.ts                # Jatakam engine (Beta)
│   ├── partner-expectations.ts # versioned preference schema
│   ├── profile-completeness.ts / trust-score.ts
├── routes/            # Page components
│   ├── _authenticated/ # Protected routes
│   └── api/           # API endpoints
└── styles.css         # Tailwind + custom CSS
```

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Cloudflare Pages
```bash
wrangler pages deploy .output/public
```

### Manual
```bash
npm run build
# Deploy .output/public to any static host
```

## 🧪 Testing

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Quality suites (correctness / recommendation quality / domain validation)
# see RELEASE.md for the one-liner
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file.

## 👥 Contact

- **GitHub Issues:** Report bugs here
<!-- support@ email intentionally unpublished until MX/mail forwarding is configured — see RELEASE.md -->

---

*Built with ❤️ for the Jangama community*
