import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { DIETS, parsePartnerExpectations } from "@/lib/partner-expectations";
import { rankProfiles, type RankCandidate } from "@/lib/ranking";
import { fetchCompatScores, RANK_COLS } from "@/lib/ranking.queries";
import { ProfileCard } from "@/components/profile-card";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Jangama" }] }),
  component: SearchPage,
});

type Profile = RankCandidate & { display_name: string; gender: string | null };

function SearchPage() {
  const [subSect, setSubSect] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [diet, setDiet] = useState("any");
  const [results, setResults] = useState<Array<Profile & { rank: { score: number } }> | null>(null);
  const [searching, setSearching] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUid(u.user.id);

      let q = supabase
        .from("profiles")
        .select(RANK_COLS)
        .eq("status", "active")
        .neq("id", u.user.id)
        .limit(100);
      if (subSect.trim()) q = q.ilike("sub_sect", `%${subSect.trim()}%`);
      if (city.trim())
        q = q.or(`city.ilike.%${city.trim()}%,native_district.ilike.%${city.trim()}%`);
      if (education.trim()) q = q.ilike("education", `%${education.trim()}%`);
      if (diet !== "any") q = q.eq("diet", diet as (typeof DIETS)[number]);
      // Age filters translate to DOB bounds (older than min ⇒ born before; younger than max ⇒ born after).
      const now = new Date();
      if (ageMin)
        q = q.lte(
          "date_of_birth",
          new Date(now.getFullYear() - Number(ageMin), now.getMonth(), now.getDate())
            .toISOString()
            .slice(0, 10),
        );
      if (ageMax)
        q = q.gte(
          "date_of_birth",
          new Date(now.getFullYear() - Number(ageMax) - 1, now.getMonth(), now.getDate())
            .toISOString()
            .slice(0, 10),
        );

      const [{ data, error }, { data: mine }, compatById] = await Promise.all([
        q,
        supabase.from("profiles").select("partner_expectations").eq("id", u.user.id).maybeSingle(),
        fetchCompatScores(u.user.id),
      ]);
      if (error) return toast.error(error.message);
      const pe = parsePartnerExpectations(mine?.partner_expectations);
      setResults(rankProfiles((data ?? []) as Profile[], pe, compatById));
    } finally {
      setSearching(false);
    }
  };

  const sendInterest = async (to: string) => {
    if (!uid) return;
    const { error } = await supabase
      .from("interests")
      .insert({ from_profile: uid, to_profile: to });
    if (error) return toast.error(error.message);
    toast.success("Interest sent");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-24">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Search</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Filter by community and background — results are ranked for you.
      </p>

      <form
        className="rounded-2xl bg-card border border-border p-5 grid sm:grid-cols-3 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div>
          <Label htmlFor="s-subsect" className="text-xs text-muted-foreground">
            Sub-sect
          </Label>
          <Input
            id="s-subsect"
            className="mt-1"
            value={subSect}
            onChange={(e) => setSubSect(e.target.value)}
            placeholder="e.g. Panchamasali"
          />
        </div>
        <div>
          <Label htmlFor="s-city" className="text-xs text-muted-foreground">
            City or native district
          </Label>
          <Input
            id="s-city"
            className="mt-1"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Hubballi"
          />
        </div>
        <div>
          <Label htmlFor="s-edu" className="text-xs text-muted-foreground">
            Education
          </Label>
          <Input
            id="s-edu"
            className="mt-1"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="e.g. BE, MBBS"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-age-min" className="text-xs text-muted-foreground">
              Age from
            </Label>
            <Input
              id="s-age-min"
              type="number"
              inputMode="numeric"
              className="mt-1"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="s-age-max" className="text-xs text-muted-foreground">
              Age to
            </Label>
            <Input
              id="s-age-max"
              type="number"
              inputMode="numeric"
              className="mt-1"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="s-diet" className="text-xs text-muted-foreground">
            Diet
          </Label>
          <Select value={diet} onValueChange={setDiet}>
            <SelectTrigger id="s-diet" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {DIETS.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">
                  {d.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={searching}>
            {searching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SearchIcon className="w-4 h-4 mr-2" />
            )}
            Search
          </Button>
        </div>
      </form>

      {results !== null && (
        <div className="mt-8">
          <div className="text-sm text-muted-foreground mb-4">
            {results.length} {results.length === 1 ? "profile" : "profiles"} found
          </div>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">
                No profiles match these filters — try widening them.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {results.map((p) => (
                <ProfileCard key={p.id} p={p} matchScore={p.rank.score} onInterest={sendInterest} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
