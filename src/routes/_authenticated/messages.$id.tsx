import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({ meta: [{ title: "Chat — Jangama" }] }),
  component: ChatPage,
});

type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

function ChatPage() {
  const { id } = useParams({ from: "/_authenticated/messages/$id" });
  const [me, setMe] = useState<string | null>(null);
  const [other, setOther] = useState<{ id: string; display_name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const { data: conv } = await supabase.from("conversations").select("profile_a, profile_b").eq("id", id).maybeSingle();
      if (conv) {
        const otherId = conv.profile_a === u.user.id ? conv.profile_b : conv.profile_a;
        const { data: p } = await supabase.from("profiles").select("id, display_name").eq("id", otherId).maybeSingle();
        if (p) setOther(p);
      }
      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
    })();
  }, [id]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-4 pb-24 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Link to="/messages" className="md:hidden"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center font-display text-primary/70">
          {other?.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1">
          <Link to="/profile/$id" params={{ id: other?.id ?? "" }} className="font-display text-lg hover:underline">{other?.display_name ?? "Chat"}</Link>
          <div className="text-xs text-muted-foreground">End-to-end privacy · verified members only</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">No messages yet. Send a warm hello 👋</div>
        ) : messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                {m.body}
                <div className={`text-[10px] mt-1 opacity-70 ${mine ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="pt-3 border-t border-border flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" maxLength={4000} disabled={sending} />
        <Button type="submit" disabled={sending || !text.trim()}><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}