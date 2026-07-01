import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const { data: isAdmin, isLoading: gate } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("id, reason, status, created_at, reported_profile, reporter_id").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["admin-subs"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("id, user_id, tier, status, amount_inr, expires_at, created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: verifs } = useQuery({
    queryKey: ["admin-verifs"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("verifications").select("id, profile_id, type, status, created_at").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (gate) return <main className="p-10">Loading…</main>;
  if (!isAdmin) return (
    <main className="mx-auto max-w-md py-20 text-center">
      <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-3" />
      <h1 className="font-display text-2xl">Admins only</h1>
      <p className="text-muted-foreground">You don't have access to this page.</p>
    </main>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      <h1 className="font-display text-3xl">Admin panel</h1>

      <Section title={`Pending verifications (${verifs?.length ?? 0})`}>
        <Table headers={["User", "Kind", "Submitted"]} rows={(verifs ?? []).map((v) => [v.profile_id.slice(0, 8), v.type, new Date(v.created_at).toLocaleString()])} />
      </Section>

      <Section title={`Recent reports (${reports?.length ?? 0})`}>
        <Table headers={["Reported", "Reporter", "Reason", "Status", "When"]} rows={(reports ?? []).map((r) => [r.reported_profile?.slice(0, 8), r.reporter_id?.slice(0, 8), r.reason, r.status, new Date(r.created_at).toLocaleString()])} />
      </Section>

      <Section title="Subscriptions">
        <Table headers={["User", "Tier", "Status", "Amount", "Expires"]} rows={(subs ?? []).map((s) => [s.user_id.slice(0, 8), s.tier, s.status, `₹${s.amount_inr}`, s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"])} />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="rounded-lg border border-border overflow-hidden">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | null | undefined)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>{headers.map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} className="p-4 text-center text-muted-foreground">No records</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i} className="border-t border-border">
            {r.map((c, j) => <td key={j} className="p-3">{c ?? "—"}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}