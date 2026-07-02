import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, GraduationCap, Sparkles, Heart, X } from "lucide-react";

export type CardProfile = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  city: string | null;
  state: string | null;
  sub_sect: string | null;
  profession: string | null;
  is_verified: boolean;
};

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export function ProfileCard({
  p,
  matchScore,
  reasons,
  onInterest,
  onDismiss,
}: {
  p: CardProfile;
  matchScore?: number;
  reasons?: string[];
  onInterest: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const age = ageFrom(p.date_of_birth);
  return (
    <div className="group rounded-2xl bg-card border border-border overflow-hidden hover:shadow-elegant transition">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-primary/20 via-secondary to-accent/30">
        <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-primary/40">
          {p.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        {p.is_verified && (
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground border border-border">
            <ShieldCheck className="w-3 h-3 mr-1 text-primary" /> Verified
          </Badge>
        )}
        {matchScore != null && (
          <Badge className="absolute top-3 right-3 bg-background/90 text-foreground border border-border">
            <Sparkles className="w-3 h-3 mr-1 text-accent" /> {matchScore}
          </Badge>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <div className="font-display text-xl font-semibold">
            {p.display_name}
            {age ? `, ${age}` : ""}
          </div>
          {p.sub_sect && <span className="text-xs text-muted-foreground">{p.sub_sect}</span>}
        </div>
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          {(p.city || p.state) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {[p.city, p.state].filter(Boolean).join(", ")}
            </div>
          )}
          {p.profession && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              {p.profession}
            </div>
          )}
        </div>
        {reasons && reasons.length > 0 && (
          <div className="mt-2 text-xs text-primary/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 shrink-0" />
            {reasons.join(" · ")}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link to="/profile/$id" params={{ id: p.id }}>
              View
            </Link>
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onInterest(p.id)}>
            <Heart className="w-3.5 h-3.5 mr-1.5" />
            Interest
          </Button>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Dismiss ${p.display_name}`}
              onClick={() => onDismiss(p.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
