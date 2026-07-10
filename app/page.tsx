import Link from "next/link";

const productSurfaces = [
  {
    href: "/spec",
    title: "Product spec",
    description: "Edit the current ForgePilot product specification.",
    action: "Open spec editor",
  },
  {
    href: "/tasks",
    title: "Task board",
    description: "Review Forge task lifecycle state and implementation progress.",
    action: "Open task board",
  },
  {
    href: "/dogfooding",
    title: "Dogfooding log",
    description: "Inspect workflow friction and improvement opportunities discovered while building ForgePilot.",
    action: "Open dogfooding log",
  },
  {
    href: "/decisions",
    title: "Decision log",
    description: "Review product and architecture decisions captured for ForgePilot.",
    action: "Open decision log",
  },
  {
    href: "/releases",
    title: "Release timeline",
    description: "Review planned, in-progress, and shipped product releases for ForgePilot.",
    action: "Open release timeline",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
            ForgePilot
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-white">
            Dogfooding Project Forge on a real product surface.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
            ForgePilot is a small product dashboard built through Forge lifecycle tasks.
            Each page validates a focused slice of product orchestration before the app grows
            into a larger AI-assisted development cockpit.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {productSurfaces.map((surface) => (
            <Link
              className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 transition hover:border-sky-400/50 hover:bg-slate-900"
              href={surface.href}
              key={surface.href}
            >
              <h2 className="text-2xl font-semibold text-white">{surface.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{surface.description}</p>
              <p className="mt-5 text-sm font-medium text-sky-300">{surface.action} →</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
