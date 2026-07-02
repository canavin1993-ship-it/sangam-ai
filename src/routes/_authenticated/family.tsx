import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Users, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({ meta: [{ title: "Family mode — Jangama" }] }),
  component: FamilyPage,
});

type Row = {
  id: string;
  member_user_id: string;
  role: string;
  status: string;
  invited_email: string | null;
};

function FamilyPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"parent" | "sibling" | "relative" | "matchmaker">("parent");
  const [saving, setSaving] = useState(false);

  const load = async (userId: string) => {
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at");
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUid(u.user.id);
      await load(u.user.id);
    })();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    const { error } = await supabase.from("family_members").insert({
      profile_id: uid,
      member_user_id: uid,
      role,
      invited_email: email,
      status: "pending",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Family member invited. They'll receive access once they join Jangama.");
    setEmail("");
    await load(uid);
  };

  const remove = async (id: string) => {
    await supabase.from("family_members").delete().eq("id", id);
    if (uid) await load(uid);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">
          Family mode
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Invite parents, siblings, or a trusted matchmaker to help browse and shortlist together.
        They see your shortlist, not your private chats.
      </p>

      <form
        onSubmit={invite}
        className="rounded-2xl bg-card border border-border p-6 grid md:grid-cols-[1fr_180px_auto] gap-3 items-end"
      >
        <div>
          <Label htmlFor="e">Email</Label>
          <Input
            id="e"
            type="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="amma@example.com"
          />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="sibling">Sibling</SelectItem>
              <SelectItem value="relative">Relative</SelectItem>
              <SelectItem value="matchmaker">Matchmaker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={saving}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No family members yet.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="font-medium">{r.invited_email ?? "Family member"}</div>
                <div className="text-xs text-muted-foreground capitalize">{r.role}</div>
              </div>
              <Badge
                variant={r.status === "accepted" ? "default" : "secondary"}
                className="capitalize"
              >
                {r.status}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
