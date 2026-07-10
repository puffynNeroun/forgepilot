import type { TaskStatusKey } from "../../lib/db/tasks";

const labels: Record<TaskStatusKey, string> = {
  proposed: "Proposed",
  approved: "Approved",
  in_progress: "In progress",
  ready_for_pr: "Ready for PR",
  completed: "Completed",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

const classes: Record<TaskStatusKey, string> = {
  proposed: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  approved: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  in_progress: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  ready_for_pr: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  cancelled: "border-red-300/30 bg-red-300/10 text-red-200",
  unknown: "border-white/10 bg-white/[0.03] text-slate-300",
};

export function TaskStatusBadge({ status }: { status: TaskStatusKey }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}
