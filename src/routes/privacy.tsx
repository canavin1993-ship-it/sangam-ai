import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Jangama Matrimony" },
      {
        name: "description",
        content: "How Jangama Matrimony collects, uses and protects your data.",
      },
      { property: "og:url", content: "https://jangamamatrimony.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://jangamamatrimony.com/privacy" }],
  }),
  component: Privacy,
});

// ponytail: honest placeholder legal copy; replace with counsel-reviewed text before scale.
function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose-sm">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
      <h1 className="font-display text-3xl text-primary mt-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <div className="mt-6 space-y-4 text-foreground/90 leading-relaxed">
        <p>
          Jangama Matrimony ("we") operates jangamamatrimony.com. We collect the profile information
          you provide (name, community details, photos, partner preferences and optional birth
          details) solely to help Jangama Veerashaiva-Lingayat families find suitable matches.
        </p>
        <p>
          Your data is stored securely and is visible only to authenticated members per our access
          controls. We never sell your personal information. Photos and contact details are shared
          only with members you choose to connect with.
        </p>
        <p>
          You may request correction or deletion of your data at any time by contacting us through
          the app. Verification documents are used only to confirm identity and are not shown
          publicly.
        </p>
        <p className="text-sm text-muted-foreground">
          This summary will be expanded into a full policy. For questions, reach us via the in-app
          support channel.
        </p>
      </div>
    </main>
  );
}
