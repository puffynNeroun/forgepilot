import type {
  DogfoodingFinding,
  DogfoodingReadyData,
} from "../../lib/db/dogfooding";
import { DogfoodingSeverityBadge } from "./DogfoodingSeverityBadge";

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function FindingCard({ finding }: { finding: DogfoodingFinding }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {finding.title}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            Updated {formatDate(finding.updatedAt)}
          </p>
        </div>

        <DogfoodingSeverityBadge severity={finding.severity} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section>
          <h4 className="text-sm font-semibold text-slate-300">Observation</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {finding.observation ?? "No observation recorded."}
          </p>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-slate-300">Resolution</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {finding.resolution ?? "No resolution recorded yet."}
          </p>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-slate-300">
            Forge improvement
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {finding.improvement ?? "No improvement candidate recorded."}
          </p>
        </section>
      </div>
    </article>
  );
}

export function DogfoodingEmptyState({
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

      <div className="mt-4 space-y-2">
        {[
          "docker compose up -d postgres",
          "pnpm db:push",
          "pnpm db:seed",
          "pnpm dev",
        ].map((command) => (
          <code
            className="block rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-100"
            key={command}
          >
            {command}
          </code>
        ))}
      </div>
    </section>
  );
}

export function DogfoodingLog({ data }: { data: DogfoodingReadyData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Findings", data.counts.total],
          ["High impact", data.counts.highImpact],
          ["Resolved", data.counts.resolved],
          ["Improvements", data.counts.improvements],
        ].map(([label, value]) => (
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            key={label}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        {data.findings.map((finding) => (
          <FindingCard finding={finding} key={finding.id} />
        ))}
      </section>
    </div>
  );
}
