import Link from "next/link";

import { DecisionLog, DecisionLogEmptyState } from "../../components/decisions/DecisionLog";
import { getDecisionLogData } from "../../lib/db/decisions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DecisionsPage() {
  const data = await getDecisionLogData();

  if (data.state === "database_error") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
          <Link className="text-sm font-medium text-rose-200 hover:text-rose-100" href="/">
            ← Back to ForgePilot home
          </Link>
          <h1 className="mt-6 text-3xl font-semibold text-white">Decision log unavailable</h1>
          <p className="mt-4 text-sm leading-6 text-rose-100/90">
            ForgePilot could not load decisions from the local database.
          </p>
          <pre className="mt-4 overflow-auto rounded-2xl border border-rose-500/20 bg-black/30 p-4 text-xs text-rose-100">
            {data.message}
          </pre>
          <p className="mt-4 text-smding-6 text-rose-100/80">
            For local development, make sure PostgreSQL is running and DATABASE_URL is set
            in .env.local.
          </p>
        </div>
      </main>
    );
  }

  if (data.state === "missing_product") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8">
          <Link className="text-sm font-medium text-amber-200 hover:text-amber-100" href="/">
            ← Back to ForgePilot home
          </Link>
          <h1 className="mt-6 text-3xl font-semibold text-white">Demo product missing</h1>
          <p className="mt-4 text-sm leading-6 text-amber-100/90">
            No product exists for slug {data.slug}. Run the database seed before viewing
            the decision log.
          </p>
        </div>
      </main>
    );
  }

  if (data.decisions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" href="/">
              ← Back to ForgePilot home
            </Link>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
              Decision log MVP
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The ForgePilot product exists, but there are no decisions to display yet.
            </p>
          </header>
          <DecisionLogEmptyState />
        </div>
      </main>
    );
  }

  return <DecisionLog data={data} />;
}
