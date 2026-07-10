import Link from "next/link";

import type { DecisionLogData, DecisionLogItem } from "../../lib/db/decisions";
import { DecisionStatusBadge } from "./DecisionStatusBadge";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type DecisionLogProps = {
  data: Extract<DecisionLogData, { state: "ready" }>;
};

export function DecisionLog({ data }: DecisionLogProps) {
  const statusRows = Object.entries(data.counts.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" href="/">
            ← Back to ForgePilot home
          </Link>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
              ForgePilot decisions
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Decision log MVP
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              Read-only product and architecture decisions for {data.product.name}. This
              keeps the project reasoning visible without adding write flows or dashboard scope.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total decisions" value={data.counts.total.toString()} />
          <SummaryCard label="Known statuses" value={statusRows.length.toString()} />
          <SummaryCard
            label="Schema mapping"
            value={Object.values(data.fieldMap).filter(Boolean).length.toString()}
          />
        </section>

        {statusRows.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Status mix
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {statusRows.map(([label, count]) => (
                <span
                  className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200"
                  key={label}
                >
                  {label}: {count}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {data.decisions.length > 0 ? (
          <section className="grid gap-5">
            {data.decisions.map((decision) => (
              <DecisionCard decision={decision} key={decision.id} />
            ))}
          </section>
        ) : (
          <DecisionLogEmptyState />
        )}
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

type DecisionCardProps = {
  decision: DecisionLogItem;
};

function DecisionCard({ decision }: DecisionCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <DecisionStatusBadge label={decision.statusLabel} status={decision.status} />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {decision.title}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {decision.type ? <MetaPill label="Type" value={decision.type} /> : null}
          {decision.category ? <MetaPill label="Category" value={decision.category} /> : null}
        </div>
      </div>

      {decision.summary ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Decision
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {decision.summary}
          </p>
        </section>
      ) : null}

      {decision.rationale ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Rationale
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {decision.rationale}
          </p>
        </section>
      ) : null}

      <footer className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
        {decision.createdAt ? <span>Created {formatDate(decision.createdAt)}</span> : null}
        {decision.updatedAt ? <span>Updated {formatDate(decision.updatedAt)}</span> : null}
      </footer>
    </article>
  );
}

type MetaPillProps = {
  label: string;
  value: string;
};

function MetaPill({ label, value }: MetaPillProps) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
      {label}: {value}
    </span>
  );
}

function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function DecisionLogEmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <h2 className="text-2xl font-semibold text-white">No decisions yet</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        The database is connected, but no decision rows exist for the ForgePilot demo product.
        Seed or create decision records outside this read-only MVP to populate this page.
      </p>
    </section>
  );
}
