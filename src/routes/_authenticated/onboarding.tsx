import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Complete your profile — Jangama" }] }),
  component: Onboarding,
});

const SUB_SECTS = ["Panchamasali", "Banajiga", "Sadaru", "Ganiga", "Reddy Lingayat", "Nonaba", "Other"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    display_name: "", gender: "", date_of_birth: "", height_cm: "",
    sub_sect: "", gotra: "", guru_lineage: "", marital_status: "never_married",
    education: "", profession: "", annual_income_inr: "",
    city: "", state: "", country: "India", native_district: "",
    diet: "vegetarian", about: "", on_behalf_of: "self",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) {
        setF((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null).map(([k, v]) => [k, String(v)])),
        }));
      }
    })();
  }, []);

  const steps = ["Basics", "Community", "Career", "Location", "About"];
  const total = steps.length;

  const save = async (finalize: boolean) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload: Record<string, unknown> = {
      id: u.user.id,
      display_name: f.display_name || "New Member",
      gender: f.gender || null,
      date_of_birth: f.date_of_birth || null,
      height_cm: f.height_cm ? Number(f.height_cm) : null,
      sub_sect: f.sub_sect || null,
      gotra: f.gotra || null,
      guru_lineage: f.guru_lineage || null,
      marital_status: f.marital_status,
      education: f.education || null,
      profession: f.profession || null,
      annual_income_inr: f.annual_income_inr ? Number(f.annual_income_inr) : null,
      city: f.city || null, state: f.state || null, country: f.country || "India",
      native_district: f.native_district || null,
      diet: f.diet, about: f.about || null,
      on_behalf_of: f.on_behalf_of,
    };
    if (finalize) {
      payload.onboarding_complete = true;
      payload.status = "active";
    }
    const { error } = await supabase.from("profiles").upsert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (finalize) { toast.success("Profile activated"); navigate({ to: "/discover" }); }
    else { toast.success("Saved"); setStep((s) => Math.min(total - 1, s + 1)); }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-24">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Step {step + 1} of {total}</div>
        <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">{steps[step]}</h1>
        <Progress value={((step + 1) / total) * 100} className="mt-4" />
      </div>
      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        {step === 0 && (<>
          <Field label="Display name"><Input value={f.display_name} onChange={(e) => set("display_name", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender"><Sel value={f.gender} onChange={(v) => set("gender", v)} options={[["male","Male"],["female","Female"]]} /></Field>
            <Field label="Date of birth"><Input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Height (cm)"><Input type="number" value={f.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></Field>
            <Field label="Profile is for"><Sel value={f.on_behalf_of} onChange={(v) => set("on_behalf_of", v)} options={[["self","Self"],["son","My son"],["daughter","My daughter"],["sibling","Sibling"],["relative","Relative"]]} /></Field>
          </div>
        </>)}
        {step === 1 && (<>
          <Field label="Sub-sect"><Sel value={f.sub_sect} onChange={(v) => set("sub_sect", v)} options={SUB_SECTS.map((s) => [s, s])} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Gotra"><Input value={f.gotra} onChange={(e) => set("gotra", e.target.value)} /></Field>
            <Field label="Guru lineage / Ayya"><Input value={f.guru_lineage} onChange={(e) => set("guru_lineage", e.target.value)} /></Field>
          </div>
          <Field label="Marital status"><Sel value={f.marital_status} onChange={(v) => set("marital_status", v)} options={[["never_married","Never married"],["divorced","Divorced"],["widowed","Widowed"],["awaiting_divorce","Awaiting divorce"]]} /></Field>
        </>)}
        {step === 2 && (<>
          <Field label="Education"><Input value={f.education} onChange={(e) => set("education", e.target.value)} placeholder="B.E. Computer Science, IIT Bombay" /></Field>
          <Field label="Profession"><Input value={f.profession} onChange={(e) => set("profession", e.target.value)} placeholder="Software Engineer at Google" /></Field>
          <Field label="Annual income (INR)"><Input type="number" value={f.annual_income_inr} onChange={(e) => set("annual_income_inr", e.target.value)} /></Field>
          <Field label="Diet"><Sel value={f.diet} onChange={(v) => set("diet", v)} options={[["vegetarian","Vegetarian"],["vegan","Vegan"],["eggetarian","Eggetarian"],["non_vegetarian","Non-vegetarian"]]} /></Field>
        </>)}
        {step === 3 && (<>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State"><Input value={f.state} onChange={(e) => set("state", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country"><Input value={f.country} onChange={(e) => set("country", e.target.value)} /></Field>
            <Field label="Native district"><Input value={f.native_district} onChange={(e) => set("native_district", e.target.value)} placeholder="Bijapur, Belgaum…" /></Field>
          </div>
        </>)}
        {step === 4 && (<>
          <Field label="About yourself"><Textarea rows={6} value={f.about} onChange={(e) => set("about", e.target.value)} placeholder="Share your values, hobbies, and what you're looking for." /></Field>
        </>)}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
          {step < total - 1 ? (
            <Button onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
          ) : (
            <Button onClick={() => save(true)} disabled={saving}>{saving ? "Activating…" : "Finish & activate profile"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}