import Link from "next/link";
import { TaskBoard, TaskBoardEmptyState } from "../../components/tasks/TaskBoard";
import { getTaskBoardData } from "../../lib/db/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TasksPage() {
  const data = await getTaskBoardData();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link className="text-sm text-sky-300 hover:text-sky-200" href="/">
          ← Back to overview
        </Link>

        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300">
            ForgePilot
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Task board MVP
          </h1>
          <p className="max-w-3xl text-slate-400">
            Read-only Forge task lifecycle view for the demo ForgePilot product.
          </p>
        </section>

        {data.status === "database_error" ? (
          <TaskBoardEmptyState
            message={data.message}
            title="Database unavailable"
            tone="red"
          />
        ) : null}

        {data.status === "missing_product" ? (
          <TaskBoardEmptyState
            message={`The demo product "${data.productSlug}" was not found. Start and seed the local database, then reload this page.`}
            title="Demo product is missing"
          />
        ) : null}

        {data.status === "empty" ? (
          <TaskBoardEmptyState
            message={`Product "${data.product.name}" exists, but it has no task records yet.`}
            title="No tasks found"
            tone="slate"
          />
        ) : null}

        {data.status === "ready" ? <TaskBoard data={data} /> : null}
      </div>
    </main>
  );
}
