import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getLandingStats } from "@/lib/landing-stats.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  Users,
  Globe2,
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  Flame,
  BookOpen,
  Home as HomeIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(landingStatsQuery),
  head: () => ({
    meta: [
      { title: "Jangama Matrimony — Free matrimony exclusively for the Jangama community" },
      {
        name: "description",
        content:
          "The only free, verified, AI-powered matrimony platform built exclusively for Jangama Veerashaiva-Lingayat families. Not open to other castes.",
      },
      { property: "og:title", content: "Jangama Matrimony — Jangama families only" },
      {
        property: "og:description",
        content:
          "Free, verified, AI-powered matrimony exclusively for the global Jangama community.",
      },
      { property: "og:url", content: "https://jangamamatrimony.com/" },
    ],
    links: [{ rel: "canonical", href: "https://jangamamatrimony.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Jangama Matrimony",
          url: "https://jangamamatrimony.com",
          description:
            "Free, verified, AI-powered matrimony platform exclusively for the Jangama Veerashaiva-Lingayat community.",
          sameAs: [
            "https://instagram.com/jangamamatrimony",
            "https://facebook.com/jangamamatrimony",
            "https://youtube.com/@jangamamatrimony",
            "https://x.com/jangamamatrimony",
          ],
        }),
      },
    ],
  }),
  component: Index,
});

const landingStatsQuery = queryOptions({
  queryKey: ["landing-stats"],
  queryFn: () => getLandingStats(),
  staleTime: 5 * 60_000,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <LiveStats />
      <ExclusivityBar />
      <Wedge />
      <HowItWorks />
      <CommunitySocial />
      <ClosingCTA />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            ಜ
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Jangama<span className="text-accent">Matrimony</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#wedge" className="hover:text-foreground transition">
            Why us
          </a>
          <a href="#how" className="hover:text-foreground transition">
            How it works
          </a>
          <a href="#community" className="hover:text-foreground transition">
            Community
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/auth">Join free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Badge
            variant="secondary"
            className="mb-5 bg-secondary/70 text-secondary-foreground border border-border"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" /> Jangama community only · 100%
            free
          </Badge>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.05] font-semibold text-primary">
            Where <span className="gradient-gold-text">tradition</span> meets modern matchmaking.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            The only matrimony platform built{" "}
            <strong>exclusively for the Jangama Veerashaiva-Lingayat community</strong>. AI-powered
            compatibility, verified-only profiles, and a family-first workflow — free for every
            Jangama family, in India and worldwide.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <ShieldCheck className="w-4 h-4" />
            <span>
              <strong>Jangama families only.</strong> No other castes or sub-castes.
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link to="/auth">Join free — Jangama only</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>
        <HeroIdentityCard />
      </div>
    </section>
  );
}

function HeroIdentityCard() {
  const pillars = [
    { icon: Flame, title: "Ishtalinga", body: "Rooted in the daily practice of Ishtalinga pooja." },
    {
      icon: BookOpen,
      title: "Vachana values",
      body: "Guided by the wisdom of Basavanna and the Sharanas.",
    },
    {
      icon: HomeIcon,
      title: "Guru lineage",
      body: "Filter by Guru parampare and native district.",
    },
    {
      icon: ShieldCheck,
      title: "Verified only",
      body: "Mandatory ID, selfie, and phone verification before any profile goes live.",
    },
  ];
  return (
    <div className="relative">
      <div className="rounded-3xl bg-card border border-border shadow-elegant overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-transparent to-accent/15 p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-3xl">
              ಜ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur border border-border px-3 py-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Jangama-verified
            </span>
          </div>
          <div className="mt-6">
            <div className="font-display text-2xl font-semibold text-primary leading-tight">
              Built for the Jangama community.
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Not a general matrimony site with a filter — a workspace made only for Jangama
              Veerashaiva-Lingayat families.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border">
          {pillars.map((p) => (
            <div key={p.title} className="p-5">
              <p.icon className="w-5 h-5 text-accent" />
              <div className="mt-3 font-semibold text-sm">{p.title}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExclusivityBar() {
  return (
    <section className="border-y border-border bg-primary/[0.04]">
      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center md:text-left">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm md:text-base text-foreground">
          <strong className="text-primary">This platform is for the Jangama community only.</strong>
          <span className="text-muted-foreground">
            {" "}
            Profiles from other castes or sub-castes are not accepted. No exceptions.
          </span>
        </p>
      </div>
    </section>
  );
}

function LiveStats() {
  const { data } = useSuspenseQuery(landingStatsQuery);
  if (!data.totalProfiles) return null;
  const items: { n: number; l: string }[] = [
    { n: data.verifiedProfiles, l: "Verified profiles" },
    { n: data.totalProfiles, l: "Jangama members" },
    { n: data.countries, l: "Countries represented" },
    { n: data.acceptedInterests, l: "Mutual connections" },
  ].filter((i) => i.n > 0);
  if (items.length === 0) return null;
  return (
    <section aria-label="Live community stats" className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div
          className={`grid gap-6 ${items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}
        >
          {items.map((i) => (
            <div key={i.l} className="text-center">
              <div className="font-display text-3xl md:text-4xl font-semibold text-primary tabular-nums">
                {formatCount(i.n)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {i.l}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          Live count · updates as our community grows
        </p>
      </div>
    </section>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(0) + "k";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

function Wedge() {
  const cards = [
    {
      icon: ShieldCheck,
      title: "Verified-only community",
      body: "Every profile passes ID, selfie, and mobile verification before appearing in search. No fakes, ever.",
    },
    {
      icon: Sparkles,
      title: "AI compatibility",
      body: "Beyond caste — values, lifestyle, career goals, and family expectations, explained in plain English.",
    },
    {
      icon: HeartHandshake,
      title: "Family workspace",
      body: "Parents and singles both get their own view. Shortlist together, chat privately, introduce families.",
    },
    {
      icon: Globe2,
      title: "Jangama-native",
      body: "Guru lineage, native district, Ishtalinga practice, and family values — the fields that actually matter.",
    },
  ];
  return (
    <section id="wedge" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary">
          Why 100× better than what exists.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          We rebuilt matrimony for our community from the ground up. No spam calls. No paid
          inflation. No fake profiles.
        </p>
      </div>
      <div className="mt-12 grid md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <div
            key={c.title}
            className="p-8 rounded-2xl bg-card border border-border hover:shadow-elegant transition group"
          >
            <c.icon className="w-8 h-8 text-accent group-hover:scale-110 transition" />
            <h3 className="mt-5 font-display text-2xl font-semibold">{c.title}</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Create your profile",
      d: "Guided wizard. Add education, career, family, and community details — takes ~4 minutes.",
    },
    {
      n: "02",
      t: "Get verified",
      d: "Selfie + government ID. Approved profiles get a trust badge and appear in search.",
    },
    {
      n: "03",
      t: "Meet meaningful matches",
      d: "Our AI ranks candidates by compatibility and explains why. You (or your parents) shortlist.",
    },
    {
      n: "04",
      t: "Connect privately",
      d: "Send interest, chat when accepted, then introduce families when you're ready.",
    },
  ];
  return (
    <section id="how" className="bg-card/40 border-y border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary">
          How it works
        </h2>
        <div className="mt-14 grid md:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="font-display text-5xl text-accent">{s.n}</div>
              <div className="mt-3 font-semibold text-lg">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunitySocial() {
  const socials = [
    {
      icon: Instagram,
      name: "Instagram",
      handle: "@jangamamatrimony",
      href: "https://instagram.com/jangamamatrimony",
    },
    {
      icon: Facebook,
      name: "Facebook",
      handle: "Jangama Matrimony",
      href: "https://facebook.com/jangamamatrimony",
    },
    {
      icon: Youtube,
      name: "YouTube",
      handle: "@jangamamatrimony",
      href: "https://youtube.com/@jangamamatrimony",
    },
    {
      icon: MessageCircle,
      name: "WhatsApp Community",
      handle: "Join the group",
      href: "https://chat.whatsapp.com/",
    },
  ];
  return (
    <section id="community" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="secondary" className="mb-4 bg-secondary/70 border border-border">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" /> Free for every Jangama family
        </Badge>
        <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary">
          Follow the Jangama community online.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Stories, success matches, community events, and updates — from Jangama families, for
          Jangama families.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-2xl bg-card border border-border hover:shadow-elegant transition group flex flex-col items-center text-center"
          >
            <s.icon className="w-8 h-8 text-accent group-hover:scale-110 transition" />
            <div className="mt-4 font-semibold">{s.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.handle}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Users className="w-12 h-12 mx-auto text-accent" />
        <h2 className="mt-6 font-display text-4xl md:text-5xl font-semibold">
          Your family's next chapter starts here.
        </h2>
        <p className="mt-4 text-primary-foreground/80 text-lg">
          A modern, family-first matrimony workspace built only for the Jangama community.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Link to="/auth">Create free profile</Link>
        </Button>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs">
              ಜ
            </span>
            <span>© {new Date().getFullYear()} Jangama Matrimony · For Jangama community only</span>
          </div>
          <span className="hidden sm:inline text-border">·</span>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/jangamamatrimony"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-foreground"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href="https://facebook.com/jangamamatrimony"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-foreground"
          >
            <Facebook className="w-4 h-4" />
          </a>
          <a
            href="https://youtube.com/@jangamamatrimony"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="hover:text-foreground"
          >
            <Youtube className="w-4 h-4" />
          </a>
          <a
            href="https://chat.whatsapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
