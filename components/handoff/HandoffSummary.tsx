import Link from "next/link";

import type { HandoffSummaryData } from "../../lib/db/handoff";
import { HandoffCopyBlock } from "./HandoffCopyBlock";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ReadyHandoffData = Extract<HandoffSummaryData, { state: "ready" }>;

type HandoffSummaryProps = {
  data: ReadyHandoffData;
};

export function HandoffSummary({ data }: HandoffSummaryProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" href="/">
            ← Back to ForgePilot home
          </Link>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
              ForgePilot handoff
            </p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">
                  Handoff summary MVP
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                  A deterministic read-only handoff for continuing ForgePilot work in a new
                  AI-assisted development chat.
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

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryMetric label="Tasks" value={data.counts.tasks} />
          <SummaryMetric label="Dogfooding" value={data.counts.dogfoodingEntries} />
          <SummaryMetric label="Decisions" value={data.counts.decisions} />
          <SummaryMetric label="Releases" value={data.counts.releases} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold text-white">Included surfaces</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.surfaces.map((surface) => (
              <Link
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300 hover:border-sky-400/50 hover:text-sky-100"
                href={surface.href}
                key={surface.href}
              >
                <span className="block font-semibold text-white">{surface.label}</span>
                <span className="mt-1 block">{surface.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <HandoffCopyBlock value={data.handoffMarkdown} />
      </div>
    </main>
  );
}

type SummaryMetricProps = {
  label: string;
  value: number;
};

function SummaryMetric({ label, value }: SummaryMetricProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
