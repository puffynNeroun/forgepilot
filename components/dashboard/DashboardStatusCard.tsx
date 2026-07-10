import Link from "next/link";

import type { DashboardBreakdown } from "../../lib/db/dashboard";

type DashboardStatusCardProps = {
  href: string;
  label: string;
  description: string;
  value: string;
  meta: string;
  breakdown: DashboardBreakdown[];
};

export function DashboardStatusCard({
  href,
  label,
  description,
  value,
  meta,
  breakdown,
}: DashboardStatusCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{meta}</p>
        </div>

        <Link
          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-400/50 hover:text-sky-200"
          href={href}
        >
          Open
        </Link>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-300">{description}</p>

      {breakdown.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {breakdown.map((item) => (
            <span
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
              key={item.label}
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
