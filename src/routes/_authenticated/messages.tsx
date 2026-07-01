import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Jangama" }] }),
  component: MessagesList,
});

type Conv = { id: string; profile_a: string; profile_b: string; last_message_at: string };
type ProfileLite = { id: string; display_name: string; sub_sect: string | null };

function MessagesList() {
  const [me, setMe] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<Conv & { other: ProfileLite | null; preview: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const { data: convs } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false });
      const list = (convs ?? []) as Conv[];
      const otherIds = list.map((c) => (c.profile_a === u.user!.id ? c.profile_b : c.profile_a));
      const { data: profiles } = otherIds.length
        ? await supabase.from("profiles").select("id, display_name, sub_sect").in("id", otherIds)
        : { data: [] as ProfileLite[] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));

      const previews = await Promise.all(list.map(async (c) => {
        const { data: last } = await supabase.from("messages").select("body").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        return last?.body ?? null;
      }));

      setConversations(list.map((c, i) => ({ ...c, other: byId.get(c.profile_a === u.user!.id ? c.profile_b : c.profile_a) ?? null, preview: previews[i] })));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">Messages</h1>
      <p className="text-sm text-muted-foreground mt-1">Private conversations with your matches.</p>

      <div className="mt-6 space-y-2">
        {me === null ? null : conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No conversations yet. Accept an interest to start chatting.</p>
          </div>
        ) : conversations.map((c) => (
          <Link key={c.id} to="/messages/$id" params={{ id: c.id }} className="block p-4 rounded-2xl bg-card border border-border hover:shadow-sm transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center font-display text-lg text-primary/70">
                {c.other?.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <div className="font-medium truncate">{c.other?.display_name ?? "Member"}</div>
                  <div className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(c.last_message_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-muted-foreground truncate">{c.preview ?? "Say hello 👋"}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}