# 🏛️ Jangama Matrimony - AI-Powered Matrimonial Platform

> The world's most advanced matrimonial platform built exclusively for the Jangama Veerashaiva-Lingayat community.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## ✨ Features

### 🔐 Authentication & Security
- **Firebase Phone OTP** - Free tier (~10,000/month verifications)
- **Supabase Auth** - Email/password and Google OAuth
- **Privacy Controls** - Granular visibility settings

### 🤖 AI-Powered Matching
- **Gemini AI Compatibility** - Deep profile analysis
- **Game Theory Matching** - Stable marriage algorithm
- **Psychology Assessment** - Big Five, Attachment, Love Languages

### 👨‍👩‍👧‍👦 Family Features
- **Family Workspace** - Parents participate in decisions
- **Gotra Compatibility** - Traditional matchmaking rules
- **Guru Lineage Matching** - Community heritage alignment

### 🎮 Gamification (Octalysis Framework)
- **8 Core Drives** - Epic Meaning, Achievement, Empowerment
- **50+ Achievements** - Unlock rewards
- **XP & Levels** - Progressive engagement
- **Streaks & Leaderboards** - Daily engagement

### 💰 Monetization
- **Coupon System** - FOUNDING50, JANGAMA2024, COMMUNITY10
- **Referral Program** - Invite & earn rewards
- **Premium Tiers** - Free, Premium (₹999/mo), Elite (₹1999/mo)

### ⭐ Trust & Reputation
- **Trust Score** (0-100) - Based on verifications
- **Match Ratings** - Post-interaction feedback
- **Success Stories** - Community testimonials

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
- `profiles` - User profiles
- `photos` - Profile photos
- `interests` - Interest expressions
- `conversations` / `messages` - Chat
- `subscriptions` - Paid plans
- `user_xp` / `user_achievements` - Gamification
- `psychology_profiles` - Personality data
- `matches` / `match_quality_cache` - AI matching

## 🌐 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/compatibility` | POST | Get AI compatibility score |
| `/api/recommended-matches` | GET | Get AI-recommended profiles |
| `/api/public/razorpay-webhook` | POST | Payment webhook |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/            # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase, Firebase, Lovable
├── lib/                # Business logic & utilities
│   ├── ai-*.ts        # AI matching functions
│   ├── gamification/  # Octalysis engine
│   └── matching/      # Game theory matching
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

## 🎯 Coupon Codes (Pre-seeded)

| Code | Discount | Description |
|------|----------|-------------|
| `FOUNDING50` | 50% | Founding member discount |
| `JANGAMA2024` | 30% | Launch special |
| `COMMUNITY10` | 10% | Community reward |
| `REFER5` | 5% | Per referral |
| `TRIAL7` | 7 days | Free trial |

## 🧪 Testing

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 📊 Gamification Achievements

- 🌟 **Profile Master** - Complete 100% profile
- 💬 **Social Butterfly** - Send 50 interests
- 🔥 **Streak Champion** - 30-day active streak
- 🏆 **Match Maker** - 10 successful matches
- 👨‍👩‍👧‍👦 **Family Hero** - Invite 5 family members

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file.

## 👥 Contact

- **Email:** support@jangamamatrimony.com
- **GitHub Issues:** Report bugs here

---

*Built with ❤️ for the Jangama community*
