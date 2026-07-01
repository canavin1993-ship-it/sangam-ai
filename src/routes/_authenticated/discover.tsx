import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, GraduationCap, Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover matches — Jangama" }] }),
  component: Discover,
});

type Profile = {
  id: string; display_name: string; gender: string | null; date_of_birth: string | null;
  city: string | null; state: string | null; sub_sect: string | null; profession: string | null;
  education: string | null; about: string | null; is_verified: boolean;
};

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob); const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function Discover() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [me, setMe] = useState<{ id: string; onboarding_complete: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mine } = await supabase.from("profiles").select("id, onboarding_complete").eq("id", u.user.id).maybeSingle();
      setMe(mine ?? { id: u.user.id, onboarding_complete: false });
      const { data, error } = await supabase.from("profiles")
        .select("id, display_name, gender, date_of_birth, city, state, sub_sect, profession, education, about, is_verified")
        .eq("status", "active")
        .neq("id", u.user.id)
        .limit(24);
      if (error) toast.error(error.message);
      setProfiles(data ?? []);
    })();
  }, []);

  const sendInterest = async (to: string) => {
    if (!me) return;
    const { error } = await supabase.from("interests").insert({ from_profile: me.id, to_profile: to });
    if (error) return toast.error(error.message);
    toast.success("Interest sent");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-24">
      {me && !me.onboarding_complete && (
        <div className="mb-6 rounded-2xl bg-primary text-primary-foreground p-6 flex flex-wrap items-center justify-between gap-4 shadow-elegant">
          <div>
            <div className="font-display text-xl">Finish setting up your profile</div>
            <div className="text-sm text-primary-foreground/80">Complete your details to appear in search and get AI matches.</div>
          </div>
          <Button asChild variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/onboarding">Continue</Link></Button>
        </div>
      )}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Discover</h1>
          <p className="text-sm text-muted-foreground mt-1">Curated Jangama profiles that match your background.</p>
        </div>
        <Badge variant="secondary" className="hidden md:inline-flex"><Sparkles className="w-3 h-3 mr-1 text-accent" /> AI-ranked</Badge>
      </div>

      {profiles === null ? (
        <div className="grid md:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No profiles yet — you're early! As more Jangama members join, matches will appear here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {profiles.map((p) => {
            const age = ageFrom(p.date_of_birth);
            return (
              <div key={p.id} className="group rounded-2xl bg-card border border-border overflow-hidden hover:shadow-elegant transition">
                <div className="aspect-[3/4] relative bg-gradient-to-br from-primary/20 via-secondary to-accent/30">
                  <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-primary/40">
                    {p.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  {p.is_verified && (
                    <Badge className="absolute top-3 left-3 bg-background/90 text-foreground border border-border">
                      <ShieldCheck className="w-3 h-3 mr-1 text-primary" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <div className="font-display text-xl font-semibold">{p.display_name}{age ? `, ${age}` : ""}</div>
                    {p.sub_sect && <span className="text-xs text-muted-foreground">{p.sub_sect}</span>}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {(p.city || p.state) && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[p.city, p.state].filter(Boolean).join(", ")}</div>}
                    {p.profession && <div className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />{p.profession}</div>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild><Link to="/profile/$id" params={{ id: p.id }}>View</Link></Button>
                    <Button size="sm" className="flex-1" onClick={() => sendInterest(p.id)}><Heart className="w-3.5 h-3.5 mr-1.5" />Interest</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}