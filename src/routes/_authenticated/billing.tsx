import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Membership — Jangama Matrimony" }] }),
  component: Membership,
});

function Membership() {
  const features = [
    "Complete Jangama profile with community fields",
    "Unlimited interests to other Jangama members",
    "AI-powered compatibility matching",
    "Verified-only community — ID + selfie checks",
    "Private 1:1 messaging after mutual interest",
    "Family workspace — invite parents & siblings",
    "Shortlists, saved profiles and search",
  ];
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" /> Free for the Jangama community
        </div>
        <h1 className="font-display text-4xl mt-4">Every feature is free for you.</h1>
        <p className="text-muted-foreground mt-3">
          Jangama Matrimony is built exclusively for the Jangama Veerashaiva-Lingayat community, and every
          feature is unlocked for every member.
        </p>
      </div>
      <div className="mt-10 rounded-2xl border border-primary/30 bg-card p-8 shadow-sm">
        <h2 className="font-display text-2xl mb-4">What's included</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link to="/discover">Start discovering matches</Link></Button>
          <Button asChild variant="outline"><Link to="/me">Complete my profile</Link></Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-6 text-center">
        Access is limited to members of the Jangama community.
      </p>
    </main>
  );
}