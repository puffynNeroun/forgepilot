import type { InsightsProduct } from "../../lib/db/insights";
import type { DogfoodingInsights as InsightsResult } from "../../lib/insights/analyze-dogfooding";

function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}

export function DogfoodingInsights({
  product,
  insights,
}: {
  product: InsightsProduct;
  insights: InsightsResult;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
          Product
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {product.name}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {product.summary}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          description="Structured dogfooding records analyzed."
          label="Total entries"
          value={insights.totalEntries}
        />
        <MetricCard
          description="Highest-ranked recurring workflow patterns."
          label="Friction groups"
          value={insights.recurringFrictions.length}
        />
        <MetricCard
          description="Recorded or deterministic fallback actions."
          label="Suggestions"
          value={insights.suggestedImprovements.length}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Severity breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Stable deterministic counts across all supported severity levels.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {insights.severityBreakdown.map((item) => (
            <MetricCard
              description={`${item.label} findings`}
              key={item.key}
              label={item.label}
              value={item.count}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Category breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Every entry receives exactly one category using ordered local
            keyword rules.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {insights.categoryBreakdown.map((item) => (
            <article
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
              key={item.key}
            >
              <p className="text-sm font-medium text-slate-300">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {item.count}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Top recurring frictions
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Ranked by occurrence count, severity impact, recency, and label.
          </p>
        </div>

        <div className="space-y-3">
          {insights.recurringFrictions.map((friction) => (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              key={friction.key}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">{friction.label}</h3>
                  <p className="mt-1 text-sm text-sky-300">
                    {formatCategory(friction.category)}
                  </p>
                </div>

                <div className="text-sm text-slate-400">
                  {friction.count} occurrence
                  {friction.count === 1 ? "" : "s"} · impact{" "}
                  {friction.severityWeight}
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {friction.explanation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Suggested next improvements
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            These are recorded or rule-derived suggestions, not AI-generated
            recommendations.
          </p>
        </div>

        <div className="space-y-3">
          {insights.suggestedImprovements.map((suggestion) => (
            <article
              className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-5"
              key={suggestion.text.toLowerCase()}
            >
              <p className="text-sm leading-6 text-slate-200">
                {suggestion.text}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                {suggestion.source === "recorded"
                  ? "Recorded improvement"
                  : "Category fallback"}{" "}
                · {suggestion.count} supporting{" "}
                {suggestion.count === 1 ? "entry" : "entries"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Classification trace
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Expand an entry to inspect the matched rule and evidence.
          </p>
        </div>

        <div className="space-y-3">
          {insights.classifiedEntries.map((entry) => (
            <details
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
              key={entry.id}
            >
              <summary className="cursor-pointer font-medium text-white">
                {entry.title}
              </summary>

              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <p>Category: {entry.categoryLabel}</p>
                <p>Rule: {entry.ruleLabel}</p>
                <p>Severity: {entry.severity}</p>
                <p>
                  Evidence:{" "}
                  {entry.matchedEvidence.length > 0
                    ? entry.matchedEvidence.join(", ")
                    : "No configured keyword matched"}
                </p>
                <p>{entry.explanation}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
        <h2 className="font-semibold text-amber-100">
          Deterministic MVP boundary
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-100/75">
          Insights are derived at request time from PostgreSQL demo records.
          They are not persisted, generated by AI, or synchronized with real
          Forge repository files.
        </p>
      </section>
    </div>
  );
}
