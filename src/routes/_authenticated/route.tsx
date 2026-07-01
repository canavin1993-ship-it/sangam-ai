import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Heart, MessageSquare, User, LogOut, Bookmark, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/discover" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">ಜ</span>
            <span className="font-display text-lg font-semibold">Jangama</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavItem to="/discover" icon={Home} label="Discover" />
            <NavItem to="/interests" icon={Heart} label="Interests" />
            <NavItem to="/messages" icon={MessageSquare} label="Messages" />
            <NavItem to="/shortlist" icon={Bookmark} label="Shortlist" />
            <NavItem to="/family" icon={Users} label="Family" />
            <NavItem to="/me" icon={User} label="Profile" />
          </nav>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
        </div>
      </header>
      <Outlet />
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border grid grid-cols-5 py-2">
        <MobileTab to="/discover" icon={Home} label="Home" />
        <MobileTab to="/interests" icon={Heart} label="Interests" />
        <MobileTab to="/messages" icon={MessageSquare} label="Chat" />
        <MobileTab to="/shortlist" icon={Bookmark} label="Saved" />
        <MobileTab to="/me" icon={User} label="Me" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-primary font-medium" }}>
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}
function MobileTab({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
      <Icon className="w-5 h-5" />{label}
    </Link>
  );
}