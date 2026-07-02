import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getCompatibility } from "@/lib/matching.functions";
import { logProfileEvent } from "@/lib/ranking.queries";
import { birthChart, gunaMilan, parseAstro, type GunaMilan } from "@/lib/astro";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Heart,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  MessageCircle,
  EyeOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/$id")({
  head: () => ({ meta: [{ title: "Profile — Jangama" }] }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string;
  gender: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  mother_tongue: string | null;
  sub_sect: string | null;
  gotra: string | null;
  guru_lineage: string | null;
  ishtalinga_practicing: boolean | null;
  marital_status: string | null;
  education: string | null;
  profession: string | null;
  annual_income_inr: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  native_district: string | null;
  diet: string | null;
  about: string | null;
  is_verified: boolean;
};

type Compat = {
  score: number;
  confidence: number;
  categories: Record<string, number>;
  summary: string;
  greenFlags: string[];
  redFlags: string[];
  conversationStarters: string[];
  missingInfo: string[];
  recommendation: "strong_match" | "worth_exploring" | "proceed_with_care" | "not_recommended";
};

const CATEGORY_LABELS: Record<string, string> = {
  community: "Community",
  lifestyle: "Lifestyle",
  education_career: "Education & career",
  family_values: "Family values",
  location: "Location",
  expectations: "Partner expectations",
};

const RECOMMENDATION_META: Record<
  Compat["recommendation"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  strong_match: { label: "Strong match", variant: "default" },
  worth_exploring: { label: "Worth exploring", variant: "secondary" },
  proceed_with_care: { label: "Proceed with care", variant: "outline" },
  not_recommended: { label: "Not recommended", variant: "destructive" },
};

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function ProfilePage() {
  const { id } = useParams({ from: "/_authenticated/profile/$id" });
  const [p, setP] = useState<Profile | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [compat, setCompat] = useState<Compat | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(false);
  const [gm, setGm] = useState<GunaMilan | null>(null);
  const compatFn = useServerFn(getCompatibility);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setP(data as Profile | null);

      const { data: phs } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("profile_id", id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (phs?.length) {
        const signed = await Promise.all(
          phs.map((ph) =>
            supabase.storage.from("profile-photos").createSignedUrl(ph.storage_path, 3600),
          ),
        );
        setPhotoUrls(signed.map((s) => s.data?.signedUrl).filter((u): u is string => !!u));
      }

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      if (u.user.id !== id) logProfileEvent(u.user.id, id, "profile_opened"); // fire-and-forget

      // Jatakam: both moon charts are derivable client-side from readable rows.
      const { data: mine } = await supabase
        .from("profiles")
        .select("date_of_birth, gender, astro" as never)
        .eq("id", u.user.id)
        .maybeSingle();
      const my = mine as {
        date_of_birth: string | null;
        gender: string | null;
        astro?: unknown;
      } | null;
      // Candidate's row was already fetched above via select("*").
      const their = data as (Profile & { astro?: unknown }) | null;
      if (my?.date_of_birth && their?.date_of_birth) {
        const myChart = birthChart(my.date_of_birth, parseAstro(my.astro));
        const theirChart = birthChart(their.date_of_birth, parseAstro(their.astro));
        if (myChart && theirChart) {
          // Guna Milan is groom/bride directional; fall back to viewer-as-groom.
          const [g, b] = my.gender === "female" ? [theirChart, myChart] : [myChart, theirChart];
          setGm(gunaMilan(g, b));
        }
      }

      const [{ data: interest }, { data: shortlist }] = await Promise.all([
        supabase
          .from("interests")
          .select("id")
          .eq("from_profile", u.user.id)
          .eq("to_profile", id)
          .maybeSingle(),
        supabase
          .from("shortlists")
          .select("id")
          .eq("owner_id", u.user.id)
          .eq("profile_id", id)
          .maybeSingle(),
      ]);
      setInterestSent(!!interest);
      setShortlisted(!!shortlist);
    })();
  }, [id]);

  const send = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("interests")
      .insert({ from_profile: u.user.id, to_profile: id });
    if (error) return toast.error(error.message);
    setInterestSent(true);
    toast.success("Interest sent");
  };

  const toggleShortlist = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (shortlisted) {
      const { error } = await supabase
        .from("shortlists")
        .delete()
        .eq("owner_id", u.user.id)
        .eq("profile_id", id);
      if (error) return toast.error(error.message);
      setShortlisted(false);
      toast.success("Removed from shortlist");
    } else {
      const { error } = await supabase
        .from("shortlists")
        .insert({ owner_id: u.user.id, profile_id: id });
      if (error) return toast.error(error.message);
      setShortlisted(true);
      toast.success("Added to shortlist");
    }
  };

  const navigate = useNavigate();
  const hide = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await logProfileEvent(u.user.id, id, "hidden");
    toast.success("Profile hidden from your recommendations");
    navigate({ to: "/discover" });
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

  const age = ageFrom(p.date_of_birth);
  const details: [string, string | null][] = [
    ["Age", age ? `${age} years` : null],
    ["Height", p.height_cm ? `${p.height_cm} cm` : null],
    ["Marital status", p.marital_status?.replace(/_/g, " ") ?? null],
    ["Diet", p.diet ?? null],
    ["Mother tongue", p.mother_tongue ?? null],
    ["Sub-sect", p.sub_sect ?? null],
    ["Gotra", p.gotra ?? null],
    ["Guru lineage", p.guru_lineage ?? null],
    [
      "Ishtalinga practicing",
      p.ishtalinga_practicing == null ? null : p.ishtalinga_practicing ? "Yes" : "No",
    ],
    ["Education", p.education ?? null],
    ["Profession", p.profession ?? null],
    [
      "Annual income",
      p.annual_income_inr ? `₹${p.annual_income_inr.toLocaleString("en-IN")}` : null,
    ],
    ["Native district", p.native_district ?? null],
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 via-secondary to-accent/30 flex items-center justify-center font-display text-8xl text-primary/40 relative overflow-hidden">
          {photoUrls[activePhoto] ? (
            <img
              src={photoUrls[activePhoto]}
              alt={p.display_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            p.display_name[0]?.toUpperCase()
          )}
        </div>
        {photoUrls.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-muted/30">
            {photoUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                aria-label={`Photo ${i + 1} of ${photoUrls.length}`}
                className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${i === activePhoto ? "border-primary" : "border-transparent hover:border-border"}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-primary">{p.display_name}</h1>
            {p.is_verified ? (
              <Badge className="bg-primary text-primary-foreground">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {[p.city, p.state, p.country].filter(Boolean).join(", ")} · {p.sub_sect ?? "—"} ·{" "}
            {p.profession ?? ""}
          </div>
          {p.about ? <p className="mt-4 leading-relaxed">{p.about}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={send} disabled={interestSent}>
              {interestSent ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Heart className="w-4 h-4 mr-2" />
              )}
              {interestSent ? "Interest sent" : "Send interest"}
            </Button>
            <Button variant="secondary" onClick={toggleShortlist}>
              {shortlisted ? (
                <BookmarkCheck className="w-4 h-4 mr-2" />
              ) : (
                <Bookmark className="w-4 h-4 mr-2" />
              )}
              {shortlisted ? "Shortlisted" : "Shortlist"}
            </Button>
            <Button variant="outline" onClick={runCompat} disabled={loadingCompat}>
              {loadingCompat ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2 text-accent" />
              )}
              {compat ? "Refresh AI compatibility" : "See AI compatibility"}
            </Button>
            <Button variant="ghost" onClick={hide} className="text-muted-foreground">
              <EyeOff className="w-4 h-4 mr-2" />
              Hide
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card border border-border p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {details
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-border/50 pb-2"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-right">{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      {gm && (
        <div className="mt-6 rounded-2xl bg-card border border-border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Jatakam — Guna Milan{" "}
                <Badge variant="secondary" className="align-middle normal-case tracking-normal">
                  Beta
                </Badge>
              </div>
              <div className="font-display text-4xl text-primary mt-1">
                {gm.totalPoints}
                <span className="text-xl text-muted-foreground">/36</span>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>
                {gm.groomChart.nakshatra} · {gm.groomChart.rashi}
              </div>
              <div>
                {gm.brideChart.nakshatra} · {gm.brideChart.rashi}
              </div>
              <div className="mt-1 text-xs">Confidence {gm.confidence}%</div>
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {gm.kootas.map((k) => (
              <div
                key={k.name}
                className="flex justify-between gap-3 border-b border-border/50 pb-1.5"
              >
                <span className="text-muted-foreground">
                  {k.name} <span className="text-xs">({k.note})</span>
                </span>
                <span className="font-medium tabular-nums">
                  {k.points}/{k.max}
                </span>
              </div>
            ))}
          </div>
          {gm.blockers.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {gm.blockers.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {gm.missingData.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="font-semibold uppercase">Improve this estimate: </span>
              {gm.missingData.join(" · ")}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Computed astronomically from birth details. Approximate — please verify important
            decisions with your family astrologer.
          </p>
        </div>
      )}

      {compat && (
        <div className="mt-6 rounded-2xl bg-card border border-border p-6">
          {/* Overall */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                AI compatibility
              </div>
              <div className="font-display text-4xl text-primary mt-1">
                {compat.score}
                <span className="text-xl text-muted-foreground">/100</span>
              </div>
              <Badge variant={RECOMMENDATION_META[compat.recommendation].variant} className="mt-2">
                {RECOMMENDATION_META[compat.recommendation].label}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Confidence
              </div>
              <div className="font-display text-2xl mt-1">{compat.confidence}%</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/90">{compat.summary}</p>

          {/* Breakdown */}
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Compatibility breakdown
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {Object.entries(compat.categories).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{CATEGORY_LABELS[key] ?? key}</span>
                    <span className="text-muted-foreground">{Math.round(value)}%</span>
                  </div>
                  <Progress
                    value={value}
                    aria-label={`${CATEGORY_LABELS[key] ?? key} ${Math.round(value)}%`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="mt-6 grid sm:grid-cols-2 gap-5">
            {compat.greenFlags.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-primary mb-2">
                  Why you're a good match
                </div>
                <ul className="space-y-1.5 text-sm">
                  {compat.greenFlags.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {compat.redFlags.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-accent-foreground mb-2">
                  Potential challenges
                </div>
                <ul className="space-y-1.5 text-sm">
                  {compat.redFlags.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Conversation starters */}
          {compat.conversationStarters.length > 0 && (
            <div className="mt-6 rounded-xl bg-secondary/40 border border-border p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                Conversation starters
              </div>
              <ul className="space-y-1.5 text-sm">
                {compat.conversationStarters.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">"</span>
                    <span className="italic">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing information */}
          {compat.missingInfo.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="font-semibold uppercase">Improve this estimate: </span>
              {compat.missingInfo.join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
