import Link from "next/link";
import {
  DogfoodingEmptyState,
  DogfoodingLog,
} from "../../components/dogfooding/DogfoodingLog";
import { getDogfoodingData } from "../../lib/db/dogfooding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DogfoodingPage() {
  const data = await getDogfoodingData();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link className="text-sm text-sky-300 hover:text-sky-200" href="/">
          ← Back to overview
        </Link>

        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300">
            ForgePilot
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Dogfooding log MVP
          </h1>
          <p className="max-w-3xl text-slate-400">
            Read-only view of workflow friction, resolutions, and potential
            Project Forge improvements discovered while building ForgePilot.
          </p>
        </section>

        {data.status === "database_error" ? (
          <DogfoodingEmptyState
            message={data.message}
            title="Database unavailable"
            tone="red"
          />
        ) : null}

        {data.status === "missing_product" ? (
          <DogfoodingEmptyState
            message={`The demo product "${data.productSlug}" was not found. Start and seed the local database, then reload this page.`}
            title="Demo product is missing"
          />
        ) : null}

        {data.status === "empty" ? (
          <DogfoodingEmptyState
            message={`Product "${data.product.name}" exists, but it has no dogfooding entries yet.`}
            title="No dogfooding entries found"
            tone="slate"
          />
        ) : null}

        {data.status === "ready" ? <DogfoodingLog data={data} /> : null}
      </div>
    </main>
  );
}
