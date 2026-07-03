import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Jangama Matrimony" },
      { name: "description", content: "The terms governing your use of Jangama Matrimony." },
      { property: "og:url", content: "https://jangamamatrimony.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://jangamamatrimony.com/terms" }],
  }),
  component: Terms,
});

// ponytail: honest placeholder legal copy; replace with counsel-reviewed text before scale.
function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose-sm">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
      <h1 className="font-display text-3xl text-primary mt-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <div className="mt-6 space-y-4 text-foreground/90 leading-relaxed">
        <p>
          By using jangamamatrimony.com you agree to provide accurate information and to use the
          platform respectfully and lawfully. Jangama Matrimony is intended exclusively for the
          Jangama Veerashaiva-Lingayat community and for genuine matrimonial purposes.
        </p>
        <p>
          You are responsible for the content you post. We may suspend or remove profiles that are
          fraudulent, abusive, impersonate others, or violate these terms. Do not misuse another
          member's contact details.
        </p>
        <p>
          Compatibility, trust, and horoscope features are guidance tools, not guarantees. Verify
          important decisions independently. The service is provided "as is" without warranties, and
          our liability is limited to the maximum extent permitted by law.
        </p>
        <p className="text-sm text-muted-foreground">
          This summary will be expanded into full terms. For questions, reach us via the in-app
          support channel.
        </p>
      </div>
    </main>
  );
}
