import { StatusBadge } from "@/components/ui/StatusBadge";

const cards = [
  {
    title: "TASK-0001 completed",
    body: "Product spec, architecture direction, MVP boundaries, decisions, and dogfooding policy are defined.",
  },
  {
    title: "TASK-0002 in progress",
    body: "The current task bootstraps the Next.js application shell, root scripts, and CI checks.",
  },
  {
    title: "Feature work deferred",
    body: "Dashboard modules, database schema, handoff generator, and release timeline come in later tasks.",
  },
];

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <StatusBadge label="early dogfood stage" />

        <div className="mt-6 max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            ForgePilot is the first real product built to test Project Forge.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            This application starts as a visible workflow dashboard for
            AI-assisted product development. The repository intentionally shows
            specs, task lifecycle artifacts, decisions, dogfooding notes, and CI
            setup before product features are implemented.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-6"
            key={card.title}
          >
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
