import type {
  TaskBoardReadyData,
  TaskBoardTask,
  TaskStatusKey,
} from "../../lib/db/tasks";
import { TaskStatusBadge } from "./TaskStatusBadge";

const statusOrder: TaskStatusKey[] = [
  "proposed",
  "approved",
  "in_progress",
  "ready_for_pr",
  "completed",
  "cancelled",
  "unknown",
];

const headings: Record<TaskStatusKey, string> = {
  proposed: "Proposed",
  approved: "Approved",
  in_progress: "In progress",
  ready_for_pr: "Ready for PR",
  completed: "Completed",
  cancelled: "Cancelled",
  unknown: "Other",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function groupTasks(tasks: TaskBoardTask[]) {
  return statusOrder
    .map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status),
    }))
    .filter((group) => group.tasks.length > 0);
}

function TaskCard({ task }: { task: TaskBoardTask }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            {task.displayId}
          </p>
          <h3 className="text-lg font-semibold text-slate-100">
            {task.title}
          </h3>
        </div>

        <TaskStatusBadge status={task.status} />
      </div>

      {task.summary ? (
        <p className="mt-4 text-sm leading-6 text-slate-400">{task.summary}</p>
      ) : null}

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Updated</dt>
          <dd className="mt-1 text-slate-300">{formatDate(task.updatedAt)}</dd>
        </div>

        <div>
          <dt className="text-slate-500">Branch</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-300">
            {task.branchName ?? "Not linked"}
          </dd>
        </div>

        <div>
          <dt className="text-slate-500">PR</dt>
          <dd className="mt-1 break-all text-slate-300">
            {task.pullRequestUrl ? (
              <a
                className="text-sky-300 hover:text-sky-200"
                href={task.pullRequestUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open PR
              </a>
            ) : (
              "Not linked"
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function TaskBoardEmptyState({
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

export function TaskBoard({ data }: { data: TaskBoardReadyData }) {
  const groups = groupTasks(data.tasks);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Total", data.counts.total],
          ["Active", data.counts.active],
          ["Ready PR", data.counts.readyForPr],
          ["Done", data.counts.completed],
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

      <section className="space-y-6">
        {groups.map((group) => (
          <div className="space-y-3" key={group.status}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{headings[group.status]}</h2>
              <span className="text-sm text-slate-500">
                {group.tasks.length}
              </span>
            </div>

            <div className="grid gap-4">
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
