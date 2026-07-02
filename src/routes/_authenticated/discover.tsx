import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parsePartnerExpectations } from "@/lib/partner-expectations";
import { rankProfiles, type RankCandidate } from "@/lib/ranking";
import { fetchCompatScores, RANK_COLS } from "@/lib/ranking.queries";
import { ProfileCard } from "@/components/profile-card";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover matches — Jangama" }] }),
  component: Discover,
});

type Profile = RankCandidate & { display_name: string; gender: string | null };

function Discover() {
  const [profiles, setProfiles] = useState<Array<Profile & { rank: { score: number } }> | null>(
    null,
  );
  const [me, setMe] = useState<{ id: string; onboarding_complete: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: mine }, { data, error }, compatById] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, onboarding_complete, partner_expectations")
          .eq("id", u.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(RANK_COLS)
          .eq("status", "active")
          .neq("id", u.user.id)
          .limit(60),
        fetchCompatScores(u.user.id),
      ]);
      setMe({ id: u.user.id, onboarding_complete: mine?.onboarding_complete ?? false });
      if (error) toast.error(error.message);
      const pe = parsePartnerExpectations(mine?.partner_expectations);
      setProfiles(rankProfiles((data ?? []) as Profile[], pe, compatById).slice(0, 24));
    })();
  }, []);

  const sendInterest = async (to: string) => {
    if (!me) return;
    const { error } = await supabase
      .from("interests")
      .insert({ from_profile: me.id, to_profile: to });
    if (error) return toast.error(error.message);
    toast.success("Interest sent");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-24">
      {me && !me.onboarding_complete && (
        <div className="mb-6 rounded-2xl bg-primary text-primary-foreground p-6 flex flex-wrap items-center justify-between gap-4 shadow-elegant">
          <div>
            <div className="font-display text-xl">Finish setting up your profile</div>
            <div className="text-sm text-primary-foreground/80">
              Complete your details to appear in search and get AI matches.
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Link to="/onboarding">Continue</Link>
          </Button>
        </div>
      )}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Discover</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by your preferences, verification, activity and AI compatibility.
          </p>
        </div>
        <Badge variant="secondary" className="hidden md:inline-flex">
          <Sparkles className="w-3 h-3 mr-1 text-accent" /> Ranked for you
        </Badge>
      </div>

      {profiles === null ? (
        <div className="grid md:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            No profiles yet — you're early! As more Jangama members join, matches will appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {profiles.map((p) => (
            <ProfileCard key={p.id} p={p} matchScore={p.rank.score} onInterest={sendInterest} />
          ))}
        </div>
      )}
    </div>
  );
}
