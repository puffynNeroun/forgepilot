import type { DogfoodingSeverityKey } from "../../lib/db/dogfooding";

const labels: Record<DogfoodingSeverityKey, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
  unknown: "Unknown",
};

const classes: Record<DogfoodingSeverityKey, string> = {
  low: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  medium: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  high: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  critical: "border-red-300/30 bg-red-300/10 text-red-200",
  unknown: "border-white/10 bg-white/[0.03] text-slate-300",
};

export function DogfoodingSeverityBadge({
  severity,
}: {
  severity: DogfoodingSeverityKey;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}
