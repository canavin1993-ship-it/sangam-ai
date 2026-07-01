import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Pencil, Upload, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "My profile — Jangama" }] }),
  component: MePage,
});

function MePage() {
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [photos, setPhotos] = useState<Array<{ id: string; storage_path: string; is_primary: boolean; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uid, setUid] = useState<string | null>(null);

  const loadPhotos = async (userId: string) => {
    const { data } = await supabase.from("photos").select("id, storage_path, is_primary").eq("profile_id", userId).order("is_primary", { ascending: false });
    const withUrls = await Promise.all(
      (data ?? []).map(async (ph) => {
        const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(ph.storage_path, 3600);
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
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setP(data as Record<string, unknown> | null);
      await loadPhotos(u.user.id);
    })();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const isFirst = photos.length === 0;
    const { error: insErr } = await supabase.from("photos").insert({ profile_id: uid, storage_path: path, is_primary: isFirst });
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
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">{String(p.display_name ?? "Your profile")}</h1>
          <div className="mt-1 flex items-center gap-2">
            {p.is_verified ? <Badge className="bg-primary text-primary-foreground"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge> : <Badge variant="secondary">Unverified</Badge>}
            <Badge variant="outline">{String(p.status ?? "draft")}</Badge>
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/onboarding"><Pencil className="w-4 h-4 mr-2" />Edit</Link></Button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-lg">Photos</div>
            <div className="text-xs text-muted-foreground">Upload clear, recent photos. Your primary photo appears on your card.</div>
          </div>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />} Upload
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </div>
        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No photos yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((ph) => (
              <div key={ph.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                {ph.url && <img src={ph.url} alt="Profile" className="w-full h-full object-cover" />}
                {ph.is_primary && <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground"><Star className="w-3 h-3 mr-1" />Primary</Badge>}
                <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition">
                  {!ph.is_primary && <Button size="sm" variant="secondary" className="flex-1 h-7 text-xs" onClick={() => setPrimary(ph.id)}>Make primary</Button>}
                  <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => remove(ph.id, ph.storage_path)}><Trash2 className="w-3 h-3" /></Button>
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