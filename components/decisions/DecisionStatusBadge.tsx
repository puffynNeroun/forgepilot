import type { DecisionStatusKey } from "../../lib/db/decisions";

const statusClasses: Record<DecisionStatusKey, string> = {
  accepted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  proposed: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  planned: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  rejected: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  deprecated: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  superseded: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  unknown: "border-white/15 bg-white/10 text-slate-300",
};

type DecisionStatusBadgeProps = {
  status: DecisionStatusKey;
  label: string;
};

export function DecisionStatusBadge({ status, label }: DecisionStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClasses[status]}`}
    >
      {label}
    </span>
  );
}
