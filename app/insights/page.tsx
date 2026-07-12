import Link from "next/link";
import { DogfoodingInsights } from "../../components/insights/DogfoodingInsights";
import { getDogfoodingInsightsData } from "../../lib/db/insights";
import { analyzeDogfooding } from "../../lib/insights/analyze-dogfooding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function StatePanel({
  title,
  message,
  tone = "amber",
}: {
  title: string;
  message: string;
  tone?: "amber" | "red" | "slate";
}) {
  const toneClasses = {
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    red: "border-red-300/20 bg-red-300/10 text-red-100",
    slate: "border-white/10 bg-white/[0.03] text-slate-100",
  };

  return (
    <section className={`rounded-2xl border p-5 ${toneClasses[tone]}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-80">{message}</p>
    </section>
  );
}

export default async function InsightsPage() {
  const data = await getDogfoodingInsightsData();
  const insights =
    data.status === "ready" ? analyzeDogfooding(data.entries) : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link className="text-sky-300 hover:text-sky-200" href="/">
            ← Back to overview
          </Link>
          <Link
            className="text-slate-400 hover:text-slate-200"
            href="/dogfooding"
          >
            Open dogfooding log
          </Link>
        </nav>

        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300">
            ForgePilot
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Dogfooding insights MVP
          </h1>
          <p className="max-w-3xl text-slate-400">
            Deterministic analysis of recurring ForgePilot and Project Forge
            workflow friction recorded in PostgreSQL dogfooding entries.
          </p>
        </section>

        {data.status === "database_error" ? (
          <StatePanel
            message={data.message}
            title="Database unavailable"
            tone="red"
          />
        ) : null}

        {data.status === "missing_product" ? (
          <StatePanel
            message={`The demo product "${data.productSlug}" was not found. Start and seed the local database, then reload this page.`}
            title="Demo product is missing"
          />
        ) : null}

        {data.status === "empty" ? (
          <StatePanel
            message={`Product "${data.product.name}" exists, but it has no dogfooding entries to analyze.`}
            title="No dogfooding entries found"
            tone="slate"
          />
        ) : null}

        {data.status === "ready" && insights ? (
          <DogfoodingInsights insights={insights} product={data.product} />
        ) : null}
      </div>
    </main>
  );
}
