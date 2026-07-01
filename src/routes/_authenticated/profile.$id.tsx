import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getCompatibility } from "@/lib/matching.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Heart, Sparkles, Loader2, Check, AlertCircle, Bookmark } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/$id")({
  head: () => ({ meta: [{ title: "Profile — Jangama" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = useParams({ from: "/_authenticated/profile/$id" });
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [compat, setCompat] = useState<{ score: number; summary: string; strengths: string[]; considerations: string[] } | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(false);
  const compatFn = useServerFn(getCompatibility);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setP(data as Record<string, unknown> | null);
      const { data: ph } = await supabase.from("photos").select("storage_path").eq("profile_id", id).eq("is_primary", true).maybeSingle();
      if (ph?.storage_path) {
        const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(ph.storage_path, 3600);
        setPhotoUrl(signed?.signedUrl ?? null);
      }
    })();
  }, [id]);
  const send = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("interests").insert({ from_profile: u.user.id, to_profile: id });
    if (error) return toast.error(error.message);
    toast.success("Interest sent");
  };
  const shortlist = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("shortlists").insert({ owner_id: u.user.id, profile_id: id });
    if (error) return toast.error(error.message);
    toast.success("Added to shortlist");
  };
  const runCompat = async () => {
    setLoadingCompat(true);
    try {
      const r = await compatFn({ data: { otherProfileId: id } });
      setCompat(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compatibility failed");
    } finally {
      setLoadingCompat(false);
    }
  };
  if (!p) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 via-secondary to-accent/30 flex items-center justify-center font-display text-8xl text-primary/40 relative overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={String(p.display_name)} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            String((p.display_name as string) ?? "?")[0]?.toUpperCase()
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-primary">{String(p.display_name)}</h1>
            {p.is_verified ? <Badge className="bg-primary text-primary-foreground"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge> : null}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {[p.city, p.state, p.country].filter(Boolean).join(", ")} · {String(p.sub_sect ?? "—")} · {String(p.profession ?? "")}
          </div>
          {p.about ? <p className="mt-4 leading-relaxed">{String(p.about)}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={send}><Heart className="w-4 h-4 mr-2" />Send interest</Button>
            <Button variant="secondary" onClick={shortlist}><Bookmark className="w-4 h-4 mr-2" />Shortlist</Button>
            <Button variant="outline" onClick={runCompat} disabled={loadingCompat}>
              {loadingCompat ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-accent" />}
              {compat ? "Refresh AI compatibility" : "See AI compatibility"}
            </Button>
          </div>
        </div>
      </div>

      {compat && (
        <div className="mt-6 rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">AI compatibility</div>
              <div className="font-display text-4xl text-primary mt-1">{compat.score}<span className="text-xl text-muted-foreground">/100</span></div>
            </div>
            <div className="text-sm text-muted-foreground max-w-md text-right">{compat.summary}</div>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-semibold uppercase text-primary mb-2">Strengths</div>
              <ul className="space-y-1.5 text-sm">
                {compat.strengths.map((s, i) => <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span>{s}</span></li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-accent-foreground mb-2">Consider</div>
              <ul className="space-y-1.5 text-sm">
                {compat.considerations.map((s, i) => <li key={i} className="flex gap-2"><AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" /><span>{s}</span></li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}