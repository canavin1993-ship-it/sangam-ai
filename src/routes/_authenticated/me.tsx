import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Pencil,
  Upload,
  Star,
  Trash2,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DIETS,
  FAMILY_TYPES,
  MARITAL_STATUSES,
  mergePartnerExpectations,
  parsePartnerExpectations,
  validatePartnerExpectations,
  type PartnerExpectations,
} from "@/lib/partner-expectations";
import { computeCompleteness, type CompletenessInput } from "@/lib/profile-completeness";
import { computeTrustScore } from "@/lib/trust-score";
import { parseAstro, mergeAstro, birthChart, NAKSHATRAS, RASHIS } from "@/lib/astro";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "My profile — Jangama" }] }),
  component: MePage,
});

function MePage() {
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [photos, setPhotos] = useState<
    Array<{
      id: string;
      storage_path: string;
      is_primary: boolean;
      moderation: string;
      url: string;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [familyStatuses, setFamilyStatuses] = useState<string[]>([]);
  const [verifications, setVerifications] = useState<Array<{ type: string; status: string }>>([]);

  const loadPhotos = async (userId: string) => {
    const { data } = await supabase
      .from("photos")
      .select("id, storage_path, is_primary, moderation")
      .eq("profile_id", userId)
      .order("is_primary", { ascending: false });
    const withUrls = await Promise.all(
      (data ?? []).map(async (ph) => {
        const { data: signed } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(ph.storage_path, 3600);
        return { ...ph, url: signed?.signedUrl ?? "" };
      }),
    );
    setPhotos(withUrls);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUid(u.user.id);
      const [{ data }, { data: fam }, { data: verifs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("family_members").select("status").eq("profile_id", u.user.id),
        supabase.from("verifications").select("type, status").eq("profile_id", u.user.id),
      ]);
      setP(data as Record<string, unknown> | null);
      setFamilyStatuses((fam ?? []).map((f) => f.status));
      setVerifications(verifs ?? []);
      await loadPhotos(u.user.id);
    })();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const isFirst = photos.length === 0;
    const { error: insErr } = await supabase
      .from("photos")
      .insert({ profile_id: uid, storage_path: path, is_primary: isFirst });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Photo uploaded");
    if (fileRef.current) fileRef.current.value = "";
    await loadPhotos(uid);
  };

  const setPrimary = async (id: string) => {
    if (!uid) return;
    await supabase.from("photos").update({ is_primary: false }).eq("profile_id", uid);
    await supabase.from("photos").update({ is_primary: true }).eq("id", id);
    await loadPhotos(uid);
  };

  const remove = async (id: string, path: string) => {
    if (!uid) return;
    await supabase.storage.from("profile-photos").remove([path]);
    await supabase.from("photos").delete().eq("id", id);
    await loadPhotos(uid);
  };

  if (!p) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const get = (k: string) => (p[k] as string | number | null) ?? "—";
  const completenessInput = {
    profile: p as unknown as CompletenessInput["profile"],
    photoCount: photos.length,
    familyStatuses,
  };
  const completeness = computeCompleteness(completenessInput);
  const trust = computeTrustScore({
    completeness: completenessInput,
    verifications,
    photoModerations: photos.map((ph) => ph.moderation),
    updatedAt: String(p.updated_at ?? new Date().toISOString()),
  });
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            {String(p.display_name ?? "Your profile")}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {p.is_verified ? (
              <Badge className="bg-primary text-primary-foreground">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary">Unverified</Badge>
            )}
            <Badge variant="outline">{String(p.status ?? "draft")}</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/onboarding">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="font-display text-lg">Profile completeness</div>
          <div className="font-display text-2xl text-primary">{completeness.percent}%</div>
        </div>
        <Progress
          value={completeness.percent}
          className="mt-3"
          aria-label={`Profile ${completeness.percent}% complete`}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {completeness.sections.map((s) => (
            <Badge
              key={s.key}
              variant={s.score >= 1 ? "default" : "secondary"}
              className="font-normal"
            >
              {s.label}
              {s.score >= 1 ? " ✓" : s.score > 0 ? ` ${Math.round(s.score * 100)}%` : ""}
            </Badge>
          ))}
        </div>
        {completeness.nextAction && (
          <div className="mt-4 rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Next: </span>
              {completeness.nextAction.action}
              {completeness.suggestions.length > 1 && (
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {completeness.suggestions.slice(1, 4).map((s, i) => (
                    <li key={i} className="flex gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {s.action}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Trust score
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Built from verifications, photos, family links and profile quality.
            </p>
          </div>
          <div className="font-display text-2xl text-primary">
            {trust.score}
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>
        <Progress
          value={trust.score}
          className="mt-3"
          aria-label={`Trust score ${trust.score} out of 100`}
        />
        <dl className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {trust.factors.map((f) => (
            <div key={f.key} className="flex justify-between gap-3">
              <dt className={f.score >= 1 ? "text-foreground" : "text-muted-foreground"}>
                {f.label}
              </dt>
              <dd className="font-medium tabular-nums">
                {Math.round(f.score * f.weight)}/{f.weight}
              </dd>
            </div>
          ))}
        </dl>
        {trust.suggestions.length > 0 && (
          <div className="mt-4 rounded-xl bg-secondary/40 border border-border p-3 text-sm">
            <span className="font-medium">Boost your trust: </span>
            {trust.suggestions[0].action}
            {trust.suggestions.length > 1 && (
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                {trust.suggestions.slice(1, 3).map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {s.action}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-lg">Photos</div>
            <div className="text-xs text-muted-foreground">
              Upload clear, recent photos. Your primary photo appears on your card.
            </div>
          </div>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Upload className="w-4 h-4 mr-1.5" />
            )}{" "}
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
        </div>
        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No photos yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((ph) => (
              <div
                key={ph.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
              >
                {ph.url && (
                  <img src={ph.url} alt="Profile" className="w-full h-full object-cover" />
                )}
                {ph.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition">
                  {!ph.is_primary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setPrimary(ph.id)}
                    >
                      Make primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2"
                    onClick={() => remove(ph.id, ph.storage_path)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 grid sm:grid-cols-2 gap-4 text-sm">
        <Field label="Gender" value={String(get("gender"))} />
        <Field label="Date of birth" value={String(get("date_of_birth"))} />
        <Field label="Sub-sect" value={String(get("sub_sect"))} />
        <Field label="Gotra" value={String(get("gotra"))} />
        <Field label="Guru lineage" value={String(get("guru_lineage"))} />
        <Field label="Marital status" value={String(get("marital_status"))} />
        <Field label="Education" value={String(get("education"))} />
        <Field label="Profession" value={String(get("profession"))} />
        <Field label="City" value={String(get("city"))} />
        <Field label="State" value={String(get("state"))} />
        <Field label="Native district" value={String(get("native_district"))} />
        <Field label="Diet" value={String(get("diet"))} />
      </div>
      {p.about ? (
        <div className="mt-6 rounded-2xl bg-card border border-border p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">About</div>
          <p className="text-foreground/90 leading-relaxed">{String(p.about)}</p>
        </div>
      ) : null}

      {uid && (
        <PartnerPrefs
          uid={uid}
          stored={p.partner_expectations}
          onSaved={(pe) => setP((prev) => (prev ? { ...prev, partner_expectations: pe } : prev))}
        />
      )}

      {uid && (
        <BirthDetails
          uid={uid}
          stored={p.astro}
          dateOfBirth={(p.date_of_birth as string | null) ?? null}
        />
      )}
    </div>
  );
}

const UTC_OFFSETS = [
  { minutes: 330, label: "India (IST, +5:30)" },
  { minutes: 240, label: "Gulf (+4:00)" },
  { minutes: 0, label: "UK (GMT, 0:00)" },
  { minutes: 60, label: "Central Europe (+1:00)" },
  { minutes: -300, label: "US Eastern (−5:00)" },
  { minutes: -480, label: "US Pacific (−8:00)" },
  { minutes: 480, label: "Singapore (+8:00)" },
  { minutes: 600, label: "Australia East (+10:00)" },
] as const;

function BirthDetails({
  uid,
  stored,
  dateOfBirth,
}: {
  uid: string;
  stored: unknown;
  dateOfBirth: string | null;
}) {
  const initial = useMemo(() => parseAstro(stored), [stored]);
  const [astro, setAstro] = useState(initial);
  const [saving, setSaving] = useState(false);
  const chart = dateOfBirth ? birthChart(dateOfBirth, astro) : null;

  const save = async () => {
    setSaving(true);
    try {
      const { data: fresh } = await supabase
        .from("profiles")
        .select("astro" as never)
        .eq("id", uid)
        .maybeSingle();
      const merged = mergeAstro((fresh as Record<string, unknown> | null)?.astro, astro);
      // Cast: astro column is newer than the generated Database types.
      const { error } = await supabase
        .from("profiles")
        .update({ astro: merged } as never)
        .eq("id", uid);
      if (error) return toast.error(error.message);
      toast.success("Birth details saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl bg-card border border-border p-6">
      <div className="mb-1 font-display text-lg">
        Birth details (Jatakam){" "}
        <Badge variant="secondary" className="align-middle">
          Beta
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Used for horoscope matching (Guna Milan). Exact birth time matters — the moon can change
        nakshatra within a day.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="astro-time" className="text-xs text-muted-foreground">
            Time of birth
          </Label>
          <Input
            id="astro-time"
            type="time"
            className="mt-1"
            value={astro.timeOfBirth ?? ""}
            onChange={(e) => setAstro((a) => ({ ...a, timeOfBirth: e.target.value || null }))}
          />
        </div>
        <div>
          <Label htmlFor="astro-place" className="text-xs text-muted-foreground">
            Place of birth
          </Label>
          <Input
            id="astro-place"
            className="mt-1"
            placeholder="e.g. Hubballi, Karnataka"
            value={astro.placeOfBirth ?? ""}
            onChange={(e) => setAstro((a) => ({ ...a, placeOfBirth: e.target.value || null }))}
          />
        </div>
        <div>
          <Label htmlFor="astro-tz" className="text-xs text-muted-foreground">
            Birth time zone
          </Label>
          <Select
            value={String(astro.utcOffsetMinutes)}
            onValueChange={(v) => setAstro((a) => ({ ...a, utcOffsetMinutes: Number(v) }))}
          >
            <SelectTrigger id="astro-tz" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UTC_OFFSETS.map((o) => (
                <SelectItem key={o.minutes} value={String(o.minutes)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {chart && (
        <div className="mt-4 text-sm text-muted-foreground">
          Your moon chart:{" "}
          <span className="font-medium text-foreground">{NAKSHATRAS[chart.nakshatra]}</span>{" "}
          nakshatra, <span className="font-medium text-foreground">{RASHIS[chart.rashi]}</span>{" "}
          rashi
          {chart.approximateTime && " (approximate — add your birth time for accuracy)"}
        </div>
      )}
      {!dateOfBirth && (
        <div className="mt-4 text-sm text-muted-foreground">
          Add your date of birth in onboarding to see your moon chart.
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save birth details
        </Button>
      </div>
    </div>
  );
}

const TRISTATE_OPTIONS: Array<{ value: "any" | "yes" | "no"; label: string }> = [
  { value: "any", label: "No preference" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function PartnerPrefs({
  uid,
  stored,
  onSaved,
}: {
  uid: string;
  stored: unknown;
  onSaved: (pe: PartnerExpectations) => void;
}) {
  const initial = useMemo(() => parsePartnerExpectations(stored), [stored]);
  const [pe, setPe] = useState<PartnerExpectations>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PartnerExpectations>(k: K, v: PartnerExpectations[K]) =>
    setPe((prev) => ({ ...prev, [k]: v }));
  const toggle = (list: readonly string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const save = async () => {
    const errors = validatePartnerExpectations(pe);
    if (errors.length) return toast.error(errors[0]);
    setSaving(true);
    try {
      // Re-read stored JSONB and merge so unknown keys from other writers survive.
      const { data: fresh } = await supabase
        .from("profiles")
        .select("partner_expectations")
        .eq("id", uid)
        .maybeSingle();
      const merged = mergePartnerExpectations(fresh?.partner_expectations, pe);
      // Cast: zod passthrough output is valid JSON but TS can't index it as the generated Json type.
      const { error } = await supabase
        .from("profiles")
        .update({ partner_expectations: merged as unknown as Json })
        .eq("id", uid);
      if (error) return toast.error(error.message);
      onSaved(merged);
      toast.success("Partner preferences saved");
    } finally {
      setSaving(false);
    }
  };

  const numInput = (
    label: string,
    id: string,
    value: number | null,
    onChange: (v: number | null) => void,
  ) => (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        className="mt-1"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );

  const listInput = (
    label: string,
    id: string,
    value: string[],
    onChange: (v: string[]) => void,
    placeholder: string,
  ) => (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        className="mt-1"
        placeholder={placeholder}
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );

  const triSelect = (
    label: string,
    id: string,
    value: "yes" | "no" | null,
    onChange: (v: "yes" | "no" | null) => void,
  ) => (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value ?? "any"}
        onValueChange={(v) => onChange(v === "any" ? null : (v as "yes" | "no"))}
      >
        <SelectTrigger id={id} className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRISTATE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="mt-6 rounded-2xl bg-card border border-border p-6">
      <div className="mb-1 font-display text-lg">Partner preferences</div>
      <p className="text-xs text-muted-foreground mb-5">
        These shape your matches and AI compatibility. Leave anything blank for no preference.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-3">
          {numInput("Age from", "pe-age-min", pe.age.min, (v) => set("age", { ...pe.age, min: v }))}
          {numInput("Age to", "pe-age-max", pe.age.max, (v) => set("age", { ...pe.age, max: v }))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numInput("Height from (cm)", "pe-h-min", pe.height.min, (v) =>
            set("height", { ...pe.height, min: v }),
          )}
          {numInput("Height to (cm)", "pe-h-max", pe.height.max, (v) =>
            set("height", { ...pe.height, max: v }),
          )}
        </div>
        {listInput(
          "Preferred sub-sects",
          "pe-subsect",
          pe.subSect,
          (v) => set("subSect", v),
          "e.g. Panchamasali, Banajiga",
        )}
        {listInput(
          "Preferred locations",
          "pe-loc",
          pe.location,
          (v) => set("location", v),
          "e.g. Bengaluru, Hubballi",
        )}
        {listInput(
          "Education",
          "pe-edu",
          pe.education,
          (v) => set("education", v),
          "e.g. BE, MBBS, MBA",
        )}
        {listInput(
          "Profession",
          "pe-prof",
          pe.profession,
          (v) => set("profession", v),
          "e.g. Engineer, Doctor",
        )}
        {listInput(
          "Languages",
          "pe-lang",
          pe.language,
          (v) => set("language", v),
          "e.g. Kannada, English",
        )}
        {triSelect("Open to relocation", "pe-reloc", pe.relocation, (v) => set("relocation", v))}
        {triSelect("Smoking acceptable", "pe-smoke", pe.smoking, (v) => set("smoking", v))}
        {triSelect("Drinking acceptable", "pe-drink", pe.drinking, (v) => set("drinking", v))}
        {triSelect("Horoscope match required", "pe-horo", pe.horoscopeRequired, (v) =>
          set("horoscopeRequired", v),
        )}
        <div>
          <Label htmlFor="pe-children" className="text-xs text-muted-foreground">
            Children
          </Label>
          <Select
            value={pe.childrenPreference ?? "any"}
            onValueChange={(v) =>
              set("childrenPreference", v === "any" ? null : (v as "want" | "dont_want" | "open"))
            }
          >
            <SelectTrigger id="pe-children" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">No preference</SelectItem>
              <SelectItem value="want">Want children</SelectItem>
              <SelectItem value="dont_want">Don't want children</SelectItem>
              <SelectItem value="open">Open to discussion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs text-muted-foreground mb-2">Marital status</legend>
        <div className="flex flex-wrap gap-4">
          {MARITAL_STATUSES.map((ms) => (
            <label key={ms} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
              <Checkbox
                checked={pe.maritalStatus.includes(ms)}
                onCheckedChange={() =>
                  set(
                    "maritalStatus",
                    toggle(pe.maritalStatus, ms) as PartnerExpectations["maritalStatus"],
                  )
                }
              />
              {ms.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs text-muted-foreground mb-2">Diet</legend>
        <div className="flex flex-wrap gap-4">
          {DIETS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
              <Checkbox
                checked={pe.diet.includes(d)}
                onCheckedChange={() =>
                  set("diet", toggle(pe.diet, d) as PartnerExpectations["diet"])
                }
              />
              {d.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs text-muted-foreground mb-2">Family type</legend>
        <div className="flex flex-wrap gap-4">
          {FAMILY_TYPES.map((ft) => (
            <label key={ft} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
              <Checkbox
                checked={pe.familyType.includes(ft)}
                onCheckedChange={() =>
                  set("familyType", toggle(pe.familyType, ft) as PartnerExpectations["familyType"])
                }
              />
              {ft}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid sm:grid-cols-3 gap-4">
        {listInput(
          "Must-haves",
          "pe-must",
          pe.mustHave,
          (v) => set("mustHave", v),
          "e.g. vegetarian home",
        )}
        {listInput(
          "Nice-to-haves",
          "pe-nice",
          pe.niceToHave,
          (v) => set("niceToHave", v),
          "e.g. loves travel",
        )}
        {listInput(
          "Deal-breakers",
          "pe-deal",
          pe.dealBreakers,
          (v) => set("dealBreakers", v),
          "e.g. smoking",
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save preferences
        </Button>
      </div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}
