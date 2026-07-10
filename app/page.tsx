import Link from "next/link";

const surfaces = [
  {
    href: "/spec",
    title: "Product spec editor",
    description: "Edit the demo ForgePilot product specification.",
  },
  {
    href: "/tasks",
    title: "Task board MVP",
    description: "Review Forge task lifecycle state in a read-only board.",
  },
];

const completed = [
  "TASK-0001 product foundation",
  "TASK-0002 Next.js app shell",
  "TASK-0003 Prisma/PostgreSQL persistence",
  "TASK-0004 product spec editor",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300">
            ForgePilot
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight">
            Dogfood dashboard for AI-assisted product development.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
            ForgePilot turns Project Forge lifecycle artifacts into a focused
            product workspace: specs, tasks, decisions, dogfooding findings,
            handoff prompts, and releases.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
              href="/spec"
            >
              Open product spec editor
            </Link>
            <Link
              className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-white/20"
              href="/tasks"
            >
              Open task board
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Current product surfaces</h2>
            <div className="mt-4 grid gap-3">
              {surfaces.map((surface) => (
                <Link
                  className="rounded-xl border border-white/10 p-4 transition hover:border-sky-300/40 hover:bg-sky-300/5"
                  href={surface.href}
                  key={surface.href}
                >
                  <h3 className="font-semibold text-slate-100">
                    {surface.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {surface.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Completed foundation</h2>
            <ul className="mt-4 space-y-3 text-slate-300">
              {completed.map((task) => (
                <li className="flex gap-3" key={task}>
                  <span className="text-emerald-300">✓</span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
