import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shortlist")({
  head: () => ({ meta: [{ title: "Shortlist — Jangama" }] }),
  component: ShortlistPage,
});

type Row = {
  id: string;
  profile_id: string;
  note: string | null;
  profile: {
    id: string;
    display_name: string;
    city: string | null;
    state: string | null;
    sub_sect: string | null;
  } | null;
};

function ShortlistPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("shortlists")
      .select(
        "id, profile_id, note, profile:profiles!shortlists_profile_id_fkey(id, display_name, city, state, sub_sect)",
      )
      .eq("owner_id", u.user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("shortlists").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="w-6 h-6 text-primary" />
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Shortlist</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Save profiles here to review with family.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Your shortlist is empty. Open a profile and tap the bookmark icon to add.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-card border border-border flex items-start gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center font-display text-xl text-primary/70">
                {r.profile?.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to="/profile/$id"
                  params={{ id: r.profile?.id ?? "" }}
                  className="font-medium hover:underline"
                >
                  {r.profile?.display_name ?? "Member"}
                </Link>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[r.profile?.city, r.profile?.state, r.profile?.sub_sect]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {r.note && (
                  <div className="mt-2 text-sm italic text-muted-foreground">"{r.note}"</div>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
