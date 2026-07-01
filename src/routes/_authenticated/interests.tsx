import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Heart, MessageSquare, ShieldCheck, Check, X, Inbox, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/interests")({
  head: () => ({ meta: [{ title: "Interests — Jangama" }] }),
  component: InterestsPage,
});

type ProfileLite = { id: string; display_name: string; city: string | null; state: string | null; sub_sect: string | null; is_verified: boolean };
type Row = { id: string; from_profile: string; to_profile: string; status: string; created_at: string; message: string | null };
type Enriched = Row & { other: ProfileLite | null };

function InterestsPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<Enriched[]>([]);
  const [tab, setTab] = useState<"received" | "sent" | "matches">("received");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setMe(u.user.id);
    const { data } = await supabase.from("interests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Row[];
    const otherIds = Array.from(new Set(list.map((r) => (r.from_profile === u.user!.id ? r.to_profile : r.from_profile))));
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("id, display_name, city, state, sub_sect, is_verified").in("id", otherIds)
      : { data: [] as ProfileLite[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
    setRows(list.map((r) => ({ ...r, other: byId.get(r.from_profile === u.user!.id ? r.to_profile : r.from_profile) ?? null })));
  };
  useEffect(() => { load(); }, []);

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("interests").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Interest ${status}`); load();
  };

  const openChat = async (otherId: string) => {
    const { data, error } = await supabase.rpc("open_conversation", { _other: otherId });
    if (error) return toast.error(error.message);
    if (data) navigate({ to: "/messages/$id", params: { id: data as string } });
  };

  const received = rows.filter((r) => r.to_profile === me);
  const sent = rows.filter((r) => r.from_profile === me);
  const matches = rows.filter((r) => r.status === "accepted");

  const list = tab === "received" ? received : tab === "sent" ? sent : matches;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-24">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Interests</h1>
          <p className="text-sm text-muted-foreground mt-1">When both sides accept, a private chat opens.</p>
        </div>
      </div>

      <div className="inline-flex rounded-full border border-border p-1 bg-card mb-6">
        {[
          { k: "received", label: `Received (${received.length})`, icon: Inbox },
          { k: "sent", label: `Sent (${sent.length})`, icon: Send },
          { k: "matches", label: `Matches (${matches.length})`, icon: Heart },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`px-4 py-1.5 text-sm rounded-full flex items-center gap-1.5 transition ${tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border text-sm text-muted-foreground text-center">Nothing here yet.</div>
        ) : list.map((r) => (
          <div key={r.id} className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center font-display text-lg text-primary/70">
              {r.other?.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link to="/profile/$id" params={{ id: (r.other?.id ?? "") }} className="font-medium hover:underline truncate">{r.other?.display_name ?? "Member"}</Link>
                {r.other?.is_verified && <Badge variant="secondary" className="h-5 px-1.5"><ShieldCheck className="w-3 h-3 mr-0.5 text-primary" /></Badge>}
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{[r.other?.city, r.other?.state, r.other?.sub_sect].filter(Boolean).join(" · ")}</div>
            </div>
            {tab === "received" && r.status === "sent" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respond(r.id, "accepted")}><Check className="w-3.5 h-3.5 mr-1" />Accept</Button>
                <Button size="sm" variant="outline" onClick={() => respond(r.id, "declined")}><X className="w-3.5 h-3.5 mr-1" />Decline</Button>
              </div>
            )}
            {r.status === "accepted" && r.other && (
              <Button size="sm" onClick={() => openChat(r.other!.id)}><MessageSquare className="w-3.5 h-3.5 mr-1" />Message</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}