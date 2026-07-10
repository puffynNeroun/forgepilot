import Link from "next/link";

import type { ReleaseTimelineData, ReleaseTimelineItem } from "../../lib/db/releases";
import { ReleaseStatusBadge } from "./ReleaseStatusBadge";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ReleaseTimelineProps = {
  data: Extract<ReleaseTimelineData, { state: "ready" }>;
};

export function ReleaseTimeline({ data }: ReleaseTimelineProps) {
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
              ForgePilot releases
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Release timeline MVP
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              Read-only release visibility for {data.product.name}. This surface shows
              release planning state without publishing releases, creating tags, or deploying.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total releases" value={data.counts.total.toString()} />
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

        {data.releases.length > 0 ? (
          <section className="grid gap-5">
            {data.releases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </section>
        ) : (
          <ReleaseTimelineEmptyState />
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

type ReleaseCardProps = {
  release: ReleaseTimelineItem;
};

function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <ReleaseStatusBadge label={release.statusLabel} status={release.status} />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {release.title}
          </h2>
          {release.version ? (
            <p className="mt-2 text-sm font-medium text-sky-300">Version {release.version}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {release.plannedAt ? <MetaPill label="Planned" value={formatDate(release.plannedAt)} /> : null}
          {release.releasedAt ? <MetaPill label="Released" value={formatDate(release.releasedAt)} /> : null}
        </div>
      </div>

      {release.summary ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Notes
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {release.summary}
          </p>
        </section>
      ) : null}

      <footer className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
        {release.createdAt ? <span>Created {formatDate(release.createdAt)}</span> : null}
        {release.updatedAt ? <span>Updated {formatDate(release.updatedAt)}</span> : null}
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

export function ReleaseTimelineEmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <h2 className="text-2xl font-semibold text-white">No releases yet</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        The database is connected, but no release rows exist for the ForgePilot demo product.
        Seed or create release records outside this read-only MVP to populate this page.
      </p>
    </section>
  );
}
