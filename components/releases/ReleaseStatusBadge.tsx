import type { ReleaseStatusKey } from "../../lib/db/releases";

const statusClasses: Record<ReleaseStatusKey, string> = {
  planned: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  in_progress: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  released: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  cancelled: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unknown: "border-white/15 bg-white/10 text-slate-300",
};

type ReleaseStatusBadgeProps = {
  status: ReleaseStatusKey;
  label: string;
};

export function ReleaseStatusBadge({ status, label }: ReleaseStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClasses[status]}`}
    >
      {label}
    </span>
  );
}
