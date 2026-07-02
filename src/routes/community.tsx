import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Youtube, MessageCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community & Socials — Jangama Matrimony" },
      {
        name: "description",
        content:
          "Follow Jangama Matrimony on Instagram, Facebook, YouTube and WhatsApp. Community stories, success matches and updates for Jangama Veerashaiva-Lingayat families.",
      },
      { property: "og:title", content: "Jangama Matrimony — Community" },
      {
        property: "og:description",
        content: "Social channels and community groups for Jangama families.",
      },
      { property: "og:url", content: "/community" },
    ],
    links: [{ rel: "canonical", href: "/community" }],
  }),
  component: Community,
});

const socials = [
  {
    icon: Instagram,
    name: "Instagram",
    handle: "@jangamamatrimony",
    href: "https://instagram.com/jangamamatrimony",
    desc: "Daily community stories, reels and success matches.",
  },
  {
    icon: Facebook,
    name: "Facebook",
    handle: "Jangama Matrimony",
    href: "https://facebook.com/jangamamatrimony",
    desc: "Family-friendly page with events and community news.",
  },
  {
    icon: Youtube,
    name: "YouTube",
    handle: "@jangamamatrimony",
    href: "https://youtube.com/@jangamamatrimony",
    desc: "Long-form couple stories and Jangama family interviews.",
  },
  {
    icon: MessageCircle,
    name: "WhatsApp Community",
    handle: "Join the group",
    href: "https://chat.whatsapp.com/",
    desc: "Verified WhatsApp community for members and families.",
  },
];

function Community() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
              ಜ
            </span>
            <span className="font-display text-lg font-semibold">Jangama Matrimony</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Join free</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Jangama community only
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-primary">
            Our social channels & community.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Jangama Matrimony is a free platform built exclusively for the Jangama
            Veerashaiva-Lingayat community. Follow us to stay in touch with community stories,
            upcoming meets and match updates.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-2xl bg-card border border-border hover:shadow-elegant transition flex items-start gap-4"
            >
              <s.icon className="w-8 h-8 text-accent shrink-0" />
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{s.handle}</div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
