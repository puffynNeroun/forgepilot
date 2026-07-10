import Link from "next/link";

import type { DashboardOverviewData } from "../../lib/db/dashboard";
import { DashboardStatusCard } from "./DashboardStatusCard";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type DashboardOverviewProps = {
  data: Extract<DashboardOverviewData, { state: "ready" }>;
};

export function DashboardOverview({ data }: DashboardOverviewProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" href="/">
            ← Back to ForgePilot home
          </Link>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
              ForgePilot dashboard
            </p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">
                  Dashboard overview MVP
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                  Read-only overview for {data.product.name}. This page summarizes existing
                  product surfaces without replacing their detail pages or adding write workflows.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Product:</span> {data.product.slug}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span> {data.product.status}
                </p>
                <p>
                  <span className="text-slate-500">Updated:</span>{" "}
                  {dateFormatter.format(data.product.updatedAt)}
                </p>
              </div>
            </div>
          </section>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <SummaryPill label="Specs" value={data.totals.specCount} />
          <SummaryPill label="Tasks" value={data.totals.taskCount} />
          <SummaryPill label="Dogfooding" value={data.totals.dogfoodingCount} />
          <SummaryPill label="Decisions" value={data.totals.decisionCount} />
          <SummaryPill label="Releases" value={data.totals.releaseCount} />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {data.surfaces.map((surface) => (
            <DashboardStatusCard
              breakdown={surface.breakdown}
              description={surface.description}
              href={surface.href}
              key={surface.href}
              label={surface.label}
              meta={surface.meta}
              value={surface.value}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

type SummaryPillProps = {
  label: string;
  value: number;
};

function SummaryPill({ label, value }: SummaryPillProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
