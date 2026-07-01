import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Jangama" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-6 py-16 pb-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-primary">Advanced search</h1>
      <p className="mt-3 text-muted-foreground">Filter by sub-sect, native district, education, and more. Ships in the next iteration.</p>
    </div>
  ),
});