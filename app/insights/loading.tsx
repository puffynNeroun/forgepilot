export default function InsightsLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />

        <section className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-sky-300/20" />
          <div className="h-10 max-w-xl animate-pulse rounded bg-white/10" />
          <div className="h-5 max-w-3xl animate-pulse rounded bg-white/10" />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              key={item}
            />
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              key={item}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
