import Link from "next/link";

import { HandoffSummary } from "../../components/handoff/HandoffSummary";
import { getHandoffSummaryData } from "../../lib/db/handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HandoffPage() {
  const data = await getHandoffSummaryData();

  if (data.state === "database_error") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
          <Link className="text-sm font-medium text-rose-200 hover:text-rose-100" href="/">
            ← Back to ForgePilot home
          </Link>
          <h1 className="mt-6 text-3xl font-semibold text-white">Handoff unavailable</h1>
          <p className="mt-4 text-sm leading-6 text-rose-100/90">
            ForgePilot could not load handoff summary data from the local database.
          </p>
          <pre className="mt-4 overflow-auto rounded-2xl border border-rose-500/20 bg-black/30 p-4 text-xs text-rose-100">
            {data.message}
          </pre>
          <p className="mt-4 text-sm leading-6 text-rose-100/80">
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
            the handoff summary.
          </p>
        </div>
      </main>
    );
  }

  return <HandoffSummary data={data} />;
}
